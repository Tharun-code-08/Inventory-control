"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStatusTransitionAudit = buildStatusTransitionAudit;
exports.buildDocumentActionAudit = buildDocumentActionAudit;
const client_1 = require("@prisma/client");
const audit_context_1 = require("../utils/audit-context");
function buildStatusTransitionAudit(params) {
    const meta = (0, audit_context_1.auditRequestMetadata)();
    return {
        companyId: params.companyId,
        userId: params.userId,
        action: params.action ?? client_1.AuditAction.UPDATE,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        oldValues: {
            auditType: 'STATUS_TRANSITION',
            fromStatus: params.fromStatus,
        },
        newValues: {
            auditType: 'STATUS_TRANSITION',
            toStatus: params.toStatus,
            reason: params.reason ?? null,
            requestId: meta.requestId,
            timestamp: new Date().toISOString(),
        },
    };
}
function buildDocumentActionAudit(params) {
    const meta = (0, audit_context_1.auditRequestMetadata)();
    return {
        companyId: params.companyId,
        userId: params.userId,
        action: client_1.AuditAction.UPDATE,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        newValues: {
            auditType: 'ACTION',
            action: params.action,
            result: params.result,
            requestId: meta.requestId,
            timestamp: new Date().toISOString(),
            ...(params.detail ?? {}),
        },
    };
}
//# sourceMappingURL=document-audit.js.map