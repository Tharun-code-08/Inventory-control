"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReceiveGoodsAudit = buildReceiveGoodsAudit;
exports.buildTransferStockAudit = buildTransferStockAudit;
exports.buildStockAdjustmentAudit = buildStockAdjustmentAudit;
const client_1 = require("@prisma/client");
const audit_context_1 = require("../utils/audit-context");
function buildReceiveGoodsAudit(params) {
    const meta = (0, audit_context_1.auditRequestMetadata)();
    return {
        companyId: params.companyId,
        userId: params.userId,
        action: client_1.AuditAction.RECEIVE_GOODS,
        entityType: 'INVENTORY',
        entityId: params.productId,
        ipAddress: meta.ipAddress ?? undefined,
        userAgent: meta.userAgent ?? undefined,
        requestId: meta.requestId ?? undefined,
        metadata: {
            productId: params.productId,
            warehouseId: params.warehouseId,
            batchId: params.batchId ?? undefined,
            referenceNo: params.referenceNo,
            beforeQty: params.beforeQty,
            delta: params.delta,
            afterQty: params.afterQty,
            timestamp: new Date().toISOString(),
        },
    };
}
function buildTransferStockAudit(params) {
    const meta = (0, audit_context_1.auditRequestMetadata)();
    return {
        companyId: params.companyId,
        userId: params.userId,
        action: client_1.AuditAction.TRANSFER_STOCK,
        entityType: 'INVENTORY',
        entityId: params.productId,
        ipAddress: meta.ipAddress ?? undefined,
        userAgent: meta.userAgent ?? undefined,
        requestId: meta.requestId ?? undefined,
        metadata: {
            productId: params.productId,
            fromWarehouse: params.fromWarehouse,
            toWarehouse: params.toWarehouse,
            qty: params.qty,
            beforeFromQty: params.beforeFromQty,
            afterFromQty: params.afterFromQty,
            beforeToQty: params.beforeToQty,
            afterToQty: params.afterToQty,
            referenceNo: params.referenceNo,
            timestamp: new Date().toISOString(),
        },
    };
}
function buildStockAdjustmentAudit(params) {
    const meta = (0, audit_context_1.auditRequestMetadata)();
    return {
        companyId: params.companyId,
        userId: params.userId,
        action: client_1.AuditAction.STOCK_ADJUSTMENT,
        entityType: 'INVENTORY',
        entityId: params.productId,
        ipAddress: meta.ipAddress ?? undefined,
        userAgent: meta.userAgent ?? undefined,
        requestId: meta.requestId ?? undefined,
        reason: params.reason,
        metadata: {
            productId: params.productId,
            warehouseId: params.warehouseId,
            adjustmentType: params.adjustmentType,
            reason: params.reason,
            beforeQty: params.beforeQty,
            delta: params.delta,
            afterQty: params.afterQty,
            referenceNo: params.referenceNo,
            timestamp: new Date().toISOString(),
        },
    };
}
//# sourceMappingURL=inventory-audit.js.map