declare class PoLine {
    productId?: string;
    lineDescription?: string;
    lineCategory?: string;
    rfqItemId?: string;
    orderQty: number;
    rate: number;
}
export declare class CreatePurchaseOrderDto {
    poNumber?: string;
    poDate: string;
    shopId: string;
    contractId?: string;
    rfqId?: string;
    supplier: string;
    remarks?: string;
    items: PoLine[];
    idempotencyKey?: string;
    sendToSupplier?: boolean;
    confirmOnSend?: boolean;
}
export {};
