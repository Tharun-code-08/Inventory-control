import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { InsufficientStockException } from '../exceptions/domain.exceptions';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  private uniqueConstraintMessage(targets: string[]) {
    const normalized = targets.map((target) => String(target).toLowerCase());

    if (normalized.includes('email')) {
      return 'A user with this email already exists';
    }

    if (normalized.includes('product_code') && normalized.includes('shop_id')) {
      return 'A product with this code already exists for the selected shop';
    }

    if (normalized.includes('shop_number')) {
      return 'A shop with this code already exists';
    }

    return 'A record with the same values already exists';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof InsufficientStockException) {
      return response.status(422).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: exception.message,
          details: exception.details,
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
            ...(targets.length > 0 ? { details: targets } : {}),
          },
        });
      }
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return response.status(503).json({
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Cannot reach the database. Check DATABASE_URL and that PostgreSQL is running.',
        },
      });
    }

    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd && exception instanceof Error) {
      this.logger.error(exception.stack);
    } else {
      this.logger.error('Unhandled error');
    }

    const devMessage =
      !isProd && exception instanceof Error ? exception.message : 'An unexpected error occurred';
    const devDetails =
      !isProd && exception instanceof Error && exception.stack
        ? exception.stack.split('\n').slice(0, 8).join('\n')
        : undefined;

    return response.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: devMessage,
        ...(devDetails ? { details: devDetails } : {}),
      },
    });
  }
}
