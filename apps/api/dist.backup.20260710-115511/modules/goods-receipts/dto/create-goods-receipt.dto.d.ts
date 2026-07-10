export declare class GoodsReceiptLineDto {
    productId: string;
    quantity: number;
    uom: string;
    purchaseRate: number;
    batchNumber?: string;
    serialNumber?: string;
    expiryDate?: string;
    storageLocationId: string;
}
export declare class CreateGoodsReceiptDto {
    grDate: string;
    shopId: string;
    purchaseOrderId?: string;
    receiptType?: 'FULL' | 'PARTIAL';
    receiptSource?: 'PURCHASE_ORDER' | 'OUTSIDE';
    inwardShift?: 'DAY_SHIFT' | 'NIGHT_SHIFT';
    supplierName: string;
    supplierRef?: string;
    remarks?: string;
    items: GoodsReceiptLineDto[];
    idempotencyKey?: string;
}
