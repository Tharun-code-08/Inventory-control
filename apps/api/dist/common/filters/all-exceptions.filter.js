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
const domain_exceptions_1 = require("../exceptions/domain.exceptions");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    uniqueConstraintMessage(targets) {
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
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        if (exception instanceof domain_exceptions_1.InsufficientStockException) {
            return response.status(422).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_STOCK',
                    message: exception.message,
                    details: exception.details,
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
        if (exception instanceof client_1.Prisma.PrismaClientInitializationError) {
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
        }
        else {
            this.logger.error('Unhandled error');
        }
        const devMessage = !isProd && exception instanceof Error ? exception.message : 'An unexpected error occurred';
        const devDetails = !isProd && exception instanceof Error && exception.stack
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
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map