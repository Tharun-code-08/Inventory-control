import { AuditAction } from '@prisma/client';
import type { AuditLogParams } from '../../modules/audit/audit.service';
export declare function buildStatusTransitionAudit(params: {
    companyId: string;
    userId: string;
    entityType: string;
    entityId: string;
    fromStatus: string;
    toStatus: string;
    reason?: string | null;
    action?: AuditAction;
}): AuditLogParams;
export declare function buildDocumentActionAudit(params: {
    companyId: string;
    userId: string;
    entityType: string;
    entityId: string;
    action: string;
    result: 'success' | 'failure';
    detail?: Record<string, unknown>;
}): AuditLogParams;
