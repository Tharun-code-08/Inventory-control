"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCreateProductAudit = buildCreateProductAudit;
exports.buildUpdateProductAudit = buildUpdateProductAudit;
exports.buildDeleteProductAudit = buildDeleteProductAudit;
const client_1 = require("@prisma/client");
const audit_context_1 = require("../utils/audit-context");
function buildCreateProductAudit(params) {
    const meta = (0, audit_context_1.auditRequestMetadata)();
    return {
        companyId: params.companyId,
        userId: params.userId,
        action: client_1.AuditAction.CREATE_PRODUCT,
        entityType: 'PRODUCT',
        entityId: params.productId,
        ipAddress: meta.ipAddress ?? undefined,
        userAgent: meta.userAgent ?? undefined,
        requestId: meta.requestId ?? undefined,
        metadata: {
            productId: params.productId,
            productCode: params.productCode,
            description: params.description,
            timestamp: new Date().toISOString(),
        },
    };
}
function buildUpdateProductAudit(params) {
    const meta = (0, audit_context_1.auditRequestMetadata)();
    return {
        companyId: params.companyId,
        userId: params.userId,
        action: client_1.AuditAction.UPDATE_PRODUCT,
        entityType: 'PRODUCT',
        entityId: params.productId,
        ipAddress: meta.ipAddress ?? undefined,
        userAgent: meta.userAgent ?? undefined,
        requestId: meta.requestId ?? undefined,
        oldValues: Object.keys(params.changedFields).length > 0
            ? Object.entries(params.changedFields).reduce((acc, [key, value]) => {
                if (value && 'old' in value) {
                    acc[key] = value.old;
                }
                return acc;
            }, {})
            : undefined,
        newValues: Object.keys(params.changedFields).length > 0
            ? Object.entries(params.changedFields).reduce((acc, [key, value]) => {
                if (value && 'new' in value) {
                    acc[key] = value.new;
                }
                return acc;
            }, {})
            : undefined,
        metadata: {
            productId: params.productId,
            productCode: params.productCode,
            changedFields: Object.keys(params.changedFields),
            timestamp: new Date().toISOString(),
        },
    };
}
function buildDeleteProductAudit(params) {
    const meta = (0, audit_context_1.auditRequestMetadata)();
    return {
        companyId: params.companyId,
        userId: params.userId,
        action: client_1.AuditAction.DELETE_PRODUCT,
        entityType: 'PRODUCT',
        entityId: params.productId,
        ipAddress: meta.ipAddress ?? undefined,
        userAgent: meta.userAgent ?? undefined,
        requestId: meta.requestId ?? undefined,
        oldValues: {
            productCode: params.productCode,
            description: params.description,
        },
        metadata: {
            productId: params.productId,
            productCode: params.productCode,
            timestamp: new Date().toISOString(),
        },
    };
}
//# sourceMappingURL=product-audit.js.map