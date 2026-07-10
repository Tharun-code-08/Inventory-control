import { AuditAction, AuditLog, AuditSeverity, Prisma } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
export type AuditLogParams = {
    companyId?: string | null;
    userId?: string | null;
    action: AuditAction;
    entityType?: string;
    entityId?: string;
    oldValues?: Prisma.InputJsonValue;
    newValues?: Prisma.InputJsonValue;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceId?: string | null;
    metadata?: Prisma.InputJsonValue;
    reason?: string;
    severity?: AuditSeverity;
    requestId?: string;
};
export type AuditFilterParams = {
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    ipAddress?: string;
    searchQuery?: string;
};
export type PaginationParams = {
    page: number;
    limit: number;
    sortBy?: 'createdAt' | 'userId' | 'action';
    sortOrder?: 'asc' | 'desc';
};
export declare class AuditService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    logTenant(actor: RequestUser, params: Omit<AuditLogParams, 'companyId' | 'userId'>, _tx?: Prisma.TransactionClient): Promise<void>;
    log(params: AuditLogParams, _tx?: Prisma.TransactionClient): Promise<void>;
    private logAsync;
    findAll(companyId: string, filters: AuditFilterParams, pagination: PaginationParams): Promise<{
        data: AuditLog[];
        total: number;
    }>;
    findById(id: string, companyId: string): Promise<AuditLog | null>;
    findByUser(companyId: string, userId: string, pagination: PaginationParams): Promise<{
        data: AuditLog[];
        total: number;
    }>;
    findByEntity(companyId: string, entityType: string, entityId: string): Promise<AuditLog[]>;
    exportCsv(companyId: string, filters: AuditFilterParams): Promise<string>;
    clearOldLogs(daysToKeep?: number): Promise<number>;
}
