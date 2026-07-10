"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApproveAudit = buildApproveAudit;
exports.buildRejectAudit = buildRejectAudit;
exports.buildEscalateAudit = buildEscalateAudit;
const client_1 = require("@prisma/client");
const audit_context_1 = require("../utils/audit-context");
function buildApproveAudit(params) {
    const meta = (0, audit_context_1.auditRequestMetadata)();
    return {
        companyId: params.companyId,
        userId: params.userId,
        action: client_1.AuditAction.APPROVE,
        entityType: params.approvalType,
        entityId: params.approvalId,
        ipAddress: meta.ipAddress ?? undefined,
        userAgent: meta.userAgent ?? undefined,
        requestId: meta.requestId ?? undefined,
        metadata: {
            approvalId: params.approvalId,
            approvalType: params.approvalType,
            documentNumber: params.documentNumber ?? undefined,
            workflowStep: params.workflowStep ?? undefined,
            comment: params.comment ?? undefined,
            timestamp: new Date().toISOString(),
        },
    };
}
function buildRejectAudit(params) {
    const meta = (0, audit_context_1.auditRequestMetadata)();
    return {
        companyId: params.companyId,
        userId: params.userId,
        action: client_1.AuditAction.REJECT,
        entityType: params.approvalType,
        entityId: params.approvalId,
        ipAddress: meta.ipAddress ?? undefined,
        userAgent: meta.userAgent ?? undefined,
        requestId: meta.requestId ?? undefined,
        metadata: {
            approvalId: params.approvalId,
            approvalType: params.approvalType,
            documentNumber: params.documentNumber ?? undefined,
            workflowStep: params.workflowStep ?? undefined,
            reason: params.reason,
            comment: params.comment ?? undefined,
            timestamp: new Date().toISOString(),
        },
    };
}
function buildEscalateAudit(params) {
    const meta = (0, audit_context_1.auditRequestMetadata)();
    return {
        companyId: params.companyId,
        userId: params.userId ?? undefined,
        action: client_1.AuditAction.ESCALATE,
        entityType: params.approvalType,
        entityId: params.approvalId,
        ipAddress: meta.ipAddress ?? undefined,
        userAgent: meta.userAgent ?? undefined,
        requestId: meta.requestId ?? undefined,
        metadata: {
            approvalId: params.approvalId,
            approvalType: params.approvalType,
            documentNumber: params.documentNumber ?? undefined,
            level: params.level,
            escalatedTo: params.escalatedTo,
            reason: params.reason,
            timestamp: new Date().toISOString(),
        },
    };
}
//# sourceMappingURL=approval-audit.js.map