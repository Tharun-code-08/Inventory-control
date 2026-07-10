export declare class BulkInventoryRowDto {
    productCode: string;
    shopNumber: string;
    storageLocationCode?: string;
    minStock?: number;
    maxStock?: number;
    reorderQty?: number;
}
export declare class BulkInventoryDto {
    rows: BulkInventoryRowDto[];
}
