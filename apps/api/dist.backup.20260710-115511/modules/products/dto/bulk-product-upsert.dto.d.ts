import { TaxPreference } from '@prisma/client';
export declare class BulkProductUpsertRowDto {
    productCode?: string;
    shopNumber?: string;
    storageLocationCode?: string;
    description: string;
    category: string;
    uom: string;
    hsnCode?: string;
    materialGroup?: string;
    drawingReference?: string;
    brand?: string;
    taxPreference?: TaxPreference;
    purchasePrice: number;
    sellingPrice: number;
    openingStock: number;
    batchNumber?: string;
    expiryDate?: string;
    minStockLevel: number;
    maxStockLevel?: number;
    reorderQty?: number;
    isActive?: boolean;
}
export declare class BulkProductUpsertDto {
    validateOnly?: boolean;
    rows: BulkProductUpsertRowDto[];
}
