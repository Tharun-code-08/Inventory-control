import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { RequestContextStore } from '../context/request-context';
import { InsufficientStockException } from '../exceptions/domain.exceptions';
import { captureServerError } from '../observability/sentry';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  private schemaDriftMessage(exception: unknown): string | null {
    if (!(exception instanceof Error)) return null;
    const msg = exception.message.toLowerCase();
    if (
      msg.includes('document_series_config') ||
      msg.includes('document_email_outbox') ||
      msg.includes('email_delivery_log') ||
      msg.includes('email_sender')
    ) {
      return 'Database schema is out of date. On the API server run: cd apps/api && npx prisma migrate deploy';
    }
    if (msg.includes('does not exist') && (msg.includes('table') || msg.includes('column') || msg.includes('relation'))) {
      return 'Database schema is out of date. On the API server run: cd apps/api && npx prisma migrate deploy';
    }
    if (
      msg.includes('pdf engine') ||
      msg.includes('chromium') ||
      msg.includes('could not render pdf')
    ) {
      return 'PDF engine unavailable. Install Chromium/Chrome on the API server or set PUPPETEER_EXECUTABLE_PATH.';
    }
    return null;
  }

  private uniqueConstraintMessage(targets: string[]) {
    const normalized = targets.map((target) => String(target).toLowerCase());

    if (normalized.includes('email')) {
      return 'A user with this email already exists';
    }

    if (normalized.includes('product_code') && normalized.includes('shop_id')) {
      return 'A product with this code already exists for the selected shop';
    }

    if (normalized.includes('shop_number')) {
      return 'A plant with this code already exists';
    }

    if (normalized.includes('rfq_number')) {
      return 'RFQ number collision detected. Please retry creating the RFQ.';
    }

    if (normalized.includes('idempotency_key')) {
      return 'A record with this idempotency key already exists';
    }

    if (normalized.includes('customer_code') && normalized.includes('shop_id')) {
      return 'A customer with this code already exists for the selected shop';
    }

    if (normalized.includes('code') && normalized.includes('shop_id')) {
      return 'A storage location with this code already exists for the selected plant';
    }

    if (normalized.includes('return_number')) {
      return 'A return with this number already exists';
    }

    return 'A record with the same values already exists';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string; user?: { id?: string; shopId?: string | null } }>();
    const requestId =
      request.requestId ??
      RequestContextStore.getRequestId() ??
      String(request.headers['x-request-id'] ?? '');

    if (exception instanceof InsufficientStockException) {
      return response.status(422).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: exception.message,
          details: exception.details,
          requestId,
        },
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const payload =
        typeof res === 'string'
          ? { message: res }
          : (res as { message?: string | string[]; error?: string; code?: string; details?: unknown });

      const message = Array.isArray(payload.message)
        ? payload.message.join(', ')
        : (payload.message ?? exception.message);

      return response.status(status).json({
        success: false,
        error: {
          code: payload.code ?? HttpStatus[status] ?? 'HTTP_ERROR',
          message,
          details: payload.details,
          requestId,
        },
      });
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P0001' && exception.message.includes('INSUFFICIENT_STOCK_DB')) {
        return response.status(422).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: 'Stock would go negative',
            details: [],
            requestId,
          },
        });
      }

      if (exception.code === 'P2002') {
        const rawTargets = exception.meta?.target;
        const targets = Array.isArray(rawTargets)
          ? rawTargets.map((target) => String(target))
          : typeof rawTargets === 'string'
            ? [rawTargets]
            : [];

        return response.status(409).json({
          success: false,
          error: {
            code: 'UNIQUE_CONSTRAINT_VIOLATION',
            message: this.uniqueConstraintMessage(targets),
            requestId,
            ...(targets.length > 0 ? { details: targets } : {}),
          },
        });
      }

      if (exception.code === 'P2025') {
        const cause = typeof exception.meta?.cause === 'string' ? exception.meta.cause : undefined;
        return response.status(404).json({
          success: false,
          error: {
            code: 'RECORD_NOT_FOUND',
            message: cause ?? 'The requested record could not be found',
            requestId,
          },
        });
      }

      if (exception.code === 'P2003') {
        const fieldName =
          typeof exception.meta?.field_name === 'string' ? exception.meta.field_name : undefined;
        return response.status(409).json({
          success: false,
          error: {
            code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
            message: 'Operation refers to a related record that does not exist or is still in use',
            requestId,
            ...(fieldName ? { details: { field: fieldName } } : {}),
          },
        });
      }

      if (exception.code === 'P2014') {
        return response.status(400).json({
          success: false,
          error: {
            code: 'RELATION_VIOLATION',
            message: 'The change would violate a required relation between records',
            requestId,
          },
        });
      }

      if (exception.code === 'P2021' || exception.code === 'P2022') {
        return response.status(503).json({
          success: false,
          error: {
            code: 'SCHEMA_OUT_OF_DATE',
            message:
              'Database schema is out of date. On the API server run: cd apps/api && npx prisma migrate deploy',
            requestId,
          },
        });
      }
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return response.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload for the database layer',
          requestId,
        },
      });
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return response.status(503).json({
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Cannot reach the database. Check DATABASE_URL and that PostgreSQL is running.',
          requestId,
        },
      });
    }

    const debugEnabled =
      String(process.env.APP_DEBUG ?? '').toLowerCase() === 'true' ||
      process.env.APP_DEBUG === '1';
    const meta = {
      requestId,
      method: request.method,
      path: request.originalUrl,
      userId: request.user?.id ?? null,
      shopId: request.user?.shopId ?? null,
    };
    if (exception instanceof Error) {
      this.logger.error(`${exception.message} | ${JSON.stringify(meta)}`);
      if (exception.stack) {
        this.logger.error(exception.stack);
      }
    } else {
      this.logger.error(`Unhandled error | ${JSON.stringify(meta)}`);
    }

    // 5xx-only Sentry capture. We never report HttpException 4xx because those
    // are user/client errors and would drown out real bugs. Capture happens
    // before sending the response so the user sees a request id they can
    // quote when reporting the failure.
    captureServerError(exception, {
      requestId: requestId || null,
      route: request.originalUrl ?? null,
      userId: request.user?.id ?? null,
    });

    const schemaMessage = this.schemaDriftMessage(exception);
    if (schemaMessage) {
      return response.status(503).json({
        success: false,
        error: {
          code: 'SCHEMA_OUT_OF_DATE',
          message: schemaMessage,
          requestId,
        },
      });
    }

    const devMessage =
      debugEnabled && exception instanceof Error ? exception.message : 'An unexpected error occurred';
    const devDetails =
      debugEnabled && exception instanceof Error && exception.stack
        ? exception.stack.split('\n').slice(0, 8).join('\n')
        : undefined;

    return response.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: devMessage,
        requestId,
        ...(devDetails ? { details: devDetails } : {}),
      },
    });
  }
}
