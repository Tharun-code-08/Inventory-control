import type { AuditLogParams } from '../../modules/audit/audit.service';
export declare function buildReceiveGoodsAudit(params: {
    companyId: string;
    userId: string;
    productId: string;
    warehouseId: string;
    batchId?: string;
    referenceNo: string;
    beforeQty: number;
    delta: number;
    afterQty: number;
}): AuditLogParams;
export declare function buildTransferStockAudit(params: {
    companyId: string;
    userId: string;
    productId: string;
    fromWarehouse: string;
    toWarehouse: string;
    qty: number;
    beforeFromQty: number;
    afterFromQty: number;
    beforeToQty: number;
    afterToQty: number;
    referenceNo: string;
}): AuditLogParams;
export declare function buildStockAdjustmentAudit(params: {
    companyId: string;
    userId: string;
    productId: string;
    warehouseId: string;
    adjustmentType: string;
    reason: string;
    beforeQty: number;
    delta: number;
    afterQty: number;
    referenceNo: string;
}): AuditLogParams;
