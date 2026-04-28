export declare class GoodsReceiptLineDto {
    productId: string;
    quantity: number;
    uom: string;
    purchaseRate: number;
}
export declare class CreateGoodsReceiptDto {
    grDate: string;
    shopId: string;
    purchaseOrderId?: string;
    supplierName: string;
    supplierRef?: string;
    remarks?: string;
    items: GoodsReceiptLineDto[];
}
