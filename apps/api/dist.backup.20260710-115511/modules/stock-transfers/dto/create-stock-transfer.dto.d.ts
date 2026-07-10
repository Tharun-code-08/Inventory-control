declare class StockTransferLineDto {
    productId: string;
    quantity: number;
    uom: string;
}
export declare class CreateStockTransferDto {
    fromShopId: string;
    toShopId: string;
    fromStorageLocationId?: string;
    toStorageLocationId?: string;
    transferDate: string;
    notes?: string;
    idempotencyKey?: string;
    items: StockTransferLineDto[];
}
export {};
