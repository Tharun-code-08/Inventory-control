"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const request_context_1 = require("../../common/context/request-context");
const redact_1 = require("../../common/utils/redact");
let AuditService = class AuditService {
    prisma;
    logger = new common_1.Logger('AuditService');
    constructor(prisma) {
        this.prisma = prisma;
    }
    async logTenant(actor, params, _tx) {
        const companyId = actor.companyId ?? null;
        await this.logAsync({ ...params, companyId, userId: actor.id });
    }
    async log(params, _tx) {
        await this.logAsync(params);
    }
    async logAsync(params) {
        try {
            const client = this.prisma;
            const requestId = params.requestId ?? request_context_1.RequestContextStore.getRequestId() ?? null;
            const baseMetadata = params.metadata && typeof params.metadata === 'object' && !Array.isArray(params.metadata)
                ? params.metadata
                : undefined;
            const metadata = requestId
                ? { ...(baseMetadata ?? {}), requestId }
                : params.metadata ?? undefined;
            const data = {
                companyId: params.companyId || undefined,
                userId: params.userId || undefined,
                action: params.action,
                entityType: params.entityType ?? null,
                entityId: params.entityId ?? null,
                oldValues: (0, redact_1.redactSensitive)(params.oldValues),
                newValues: (0, redact_1.redactSensitive)(params.newValues),
                ipAddress: params.ipAddress ?? null,
                userAgent: params.userAgent ?? null,
                deviceId: params.deviceId ?? null,
                metadata,
                reason: params.reason ?? undefined,
                severity: params.severity ?? undefined,
                requestId,
            };
            await client.auditLog.create({ data });
        }
        catch (error) {
            this.logger.error(`Audit write failed for action ${params.action}:`, error);
        }
    }
    async findAll(companyId, filters, pagination) {
        const where = {
            companyId,
            ...(filters.action && { action: filters.action }),
            ...(filters.entityType && { entityType: filters.entityType }),
            ...(filters.entityId && { entityId: filters.entityId }),
            ...(filters.userId && { userId: filters.userId }),
            ...(filters.ipAddress && { ipAddress: filters.ipAddress }),
            ...(filters.startDate || filters.endDate
                ? {
                    createdAt: {
                        ...(filters.startDate && { gte: filters.startDate }),
                        ...(filters.endDate && { lte: filters.endDate }),
                    },
                }
                : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                include: { user: { select: { id: true, email: true, name: true } } },
                orderBy: {
                    [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc',
                },
                skip: (pagination.page - 1) * pagination.limit,
                take: pagination.limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return { data, total };
    }
    async findById(id, companyId) {
        return this.prisma.auditLog.findFirst({
            where: { id, companyId },
            include: { user: { select: { id: true, email: true, name: true } } },
        });
    }
    async findByUser(companyId, userId, pagination) {
        const where = { companyId, userId };
        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                include: { user: { select: { id: true, email: true, name: true } } },
                orderBy: { [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc' },
                skip: (pagination.page - 1) * pagination.limit,
                take: pagination.limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return { data, total };
    }
    async findByEntity(companyId, entityType, entityId) {
        return this.prisma.auditLog.findMany({
            where: { companyId, entityType, entityId },
            include: { user: { select: { id: true, email: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async exportCsv(companyId, filters) {
        const where = {
            companyId,
            ...(filters.action && { action: filters.action }),
            ...(filters.entityType && { entityType: filters.entityType }),
            ...(filters.entityId && { entityId: filters.entityId }),
            ...(filters.userId && { userId: filters.userId }),
        };
        const logs = await this.prisma.auditLog.findMany({
            where,
            include: { user: { select: { id: true, email: true, name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 10000,
        });
        const headers = [
            'ID',
            'Timestamp',
            'User',
            'Email',
            'Action',
            'Entity Type',
            'Entity ID',
            'Old Values',
            'New Values',
            'IP Address',
            'Device ID',
            'Reason',
            'Severity',
            'Request ID',
        ];
        const rows = logs.map((log) => [
            log.id,
            log.createdAt.toISOString(),
            log.user?.name || '',
            log.user?.email || '',
            log.action,
            log.entityType || '',
            log.entityId || '',
            JSON.stringify(log.oldValues || {}),
            JSON.stringify(log.newValues || {}),
            log.ipAddress || '',
            log.deviceId || '',
            log.reason || '',
            log.severity || '',
            log.requestId || '',
        ]);
        const csvHeaders = headers.map((h) => `"${h}"`).join(',');
        const csvRows = rows
            .map((row) => row
            .map((cell) => {
            const str = typeof cell === 'string' ? cell : JSON.stringify(cell);
            return `"${str.replace(/"/g, '""')}"`;
        })
            .join(','))
            .join('\n');
        return `${csvHeaders}\n${csvRows}`;
    }
    async clearOldLogs(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await this.prisma.auditLog.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
            },
        });
        return result.count;
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map