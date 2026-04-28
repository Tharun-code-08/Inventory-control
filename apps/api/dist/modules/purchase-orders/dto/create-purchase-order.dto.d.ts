declare class PoLine {
    productId: string;
    orderQty: number;
    rate: number;
}
export declare class CreatePurchaseOrderDto {
    poDate: string;
    shopId: string;
    contractId?: string;
    supplier: string;
    remarks?: string;
    items: PoLine[];
}
export {};
