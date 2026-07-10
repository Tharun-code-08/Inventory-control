"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const request_context_1 = require("../context/request-context");
const domain_exceptions_1 = require("../exceptions/domain.exceptions");
const sentry_1 = require("../observability/sentry");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    schemaDriftMessage(exception) {
        if (!(exception instanceof Error))
            return null;
        const msg = exception.message.toLowerCase();
        if (msg.includes('document_series_config') ||
            msg.includes('document_email_outbox') ||
            msg.includes('email_delivery_log') ||
            msg.includes('email_sender') ||
            msg.includes('idempotency_keys') ||
            msg.includes('idempotency_key')) {
            return 'Database schema is out of date. On the API server run: cd apps/api && npx prisma migrate deploy';
        }
        if (msg.includes('does not exist') && (msg.includes('table') || msg.includes('column') || msg.includes('relation'))) {
            return 'Database schema is out of date. On the API server run: cd apps/api && npx prisma migrate deploy';
        }
        if (msg.includes('pdf engine') ||
            msg.includes('chromium') ||
            msg.includes('could not render pdf')) {
            return 'PDF engine unavailable. Install Chromium/Chrome on the API server or set PUPPETEER_EXECUTABLE_PATH.';
        }
        return null;
    }
    normalizeConstraintTarget(target) {
        return String(target).toLowerCase().replace(/_/g, '');
    }
    constraintTargetsInclude(targets, ...needles) {
        const normalized = targets.map((target) => this.normalizeConstraintTarget(target));
        return needles.every((needle) => normalized.some((target) => target.includes(needle.replace(/_/g, ''))));
    }
    uniqueConstraintMessage(targets) {
        const normalized = targets.map((target) => this.normalizeConstraintTarget(target));
        if (normalized.some((target) => target.includes('email'))) {
            return 'A user with this email already exists';
        }
        if (this.constraintTargetsInclude(targets, 'productcode', 'shopid')) {
            return 'A product with this code already exists for the selected shop';
        }
        if (normalized.some((target) => target.includes('shopnumber'))) {
            return 'A plant with this code already exists';
        }
        if (normalized.some((target) => target.includes('rfqnumber'))) {
            return 'RFQ number collision detected. Please retry creating the RFQ.';
        }
        if (normalized.some((target) => target.includes('idempotencykey'))) {
            return 'A record with this idempotency key already exists';
        }
        if (this.constraintTargetsInclude(targets, 'customercode', 'shopid')) {
            return 'A customer with this code already exists for the selected plant';
        }
        if (this.constraintTargetsInclude(targets, 'code', 'shopid')) {
            return 'A storage location with this code already exists for the selected plant';
        }
        if (normalized.some((target) => target.includes('returnnumber'))) {
            return 'A return with this number already exists';
        }
        return 'A record with the same values already exists';
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const requestId = request.requestId ??
            request_context_1.RequestContextStore.getRequestId() ??
            String(request.headers['x-request-id'] ?? '');
        if (exception instanceof domain_exceptions_1.InsufficientStockException) {
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
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const res = exception.getResponse();
            const payload = typeof res === 'string'
                ? { message: res }
                : res;
            const message = Array.isArray(payload.message)
                ? payload.message.join(', ')
                : (payload.message ?? exception.message);
            return response.status(status).json({
                success: false,
                error: {
                    code: payload.code ?? common_1.HttpStatus[status] ?? 'HTTP_ERROR',
                    message,
                    details: payload.details,
                    requestId,
                },
            });
        }
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
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
                const fieldName = typeof exception.meta?.field_name === 'string' ? exception.meta.field_name : undefined;
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
            if (exception.code === 'P2023') {
                return response.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_IDENTIFIER',
                        message: 'The request contains an invalid or malformed identifier',
                        requestId,
                    },
                });
            }
            if (exception.code === 'P2021' || exception.code === 'P2022') {
                return response.status(503).json({
                    success: false,
                    error: {
                        code: 'SCHEMA_OUT_OF_DATE',
                        message: 'Database schema is out of date. On the API server run: cd apps/api && npx prisma migrate deploy',
                        requestId,
                    },
                });
            }
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
            return response.status(400).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: `Database operation failed (${exception.code}). Please retry or contact support.`,
                    requestId,
                },
            });
        }
        if (exception instanceof client_1.Prisma.PrismaClientUnknownRequestError) {
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
            return response.status(400).json({
                success: false,
                error: {
                    code: 'DATABASE_ERROR',
                    message: 'Database operation failed. Please retry or contact support.',
                    requestId,
                },
            });
        }
        if (exception instanceof client_1.Prisma.PrismaClientValidationError) {
            return response.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request payload for the database layer',
                    requestId,
                },
            });
        }
        if (exception instanceof client_1.Prisma.PrismaClientInitializationError) {
            return response.status(503).json({
                success: false,
                error: {
                    code: 'DATABASE_UNAVAILABLE',
                    message: 'Cannot reach the database. Check DATABASE_URL and that PostgreSQL is running.',
                    requestId,
                },
            });
        }
        const debugEnabled = String(process.env.APP_DEBUG ?? '').toLowerCase() === 'true' ||
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
        }
        else {
            this.logger.error(`Unhandled error | ${JSON.stringify(meta)}`);
        }
        (0, sentry_1.captureServerError)(exception, {
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
        const devMessage = debugEnabled && exception instanceof Error ? exception.message : 'An unexpected error occurred';
        const devDetails = debugEnabled && exception instanceof Error && exception.stack
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
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map