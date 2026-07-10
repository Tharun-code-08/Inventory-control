import type { AuditLogParams } from '../../modules/audit/audit.service';
export declare function buildApproveAudit(params: {
    companyId: string;
    userId: string;
    approvalId: string;
    approvalType: string;
    documentNumber?: string | null;
    workflowStep?: number;
    comment?: string | null;
}): AuditLogParams;
export declare function buildRejectAudit(params: {
    companyId: string;
    userId: string;
    approvalId: string;
    approvalType: string;
    documentNumber?: string | null;
    workflowStep?: number;
    reason: string;
    comment?: string | null;
}): AuditLogParams;
export declare function buildEscalateAudit(params: {
    companyId: string;
    userId?: string | null;
    approvalId: string;
    approvalType: string;
    documentNumber?: string | null;
    level: number;
    escalatedTo: string;
    reason: string;
}): AuditLogParams;
