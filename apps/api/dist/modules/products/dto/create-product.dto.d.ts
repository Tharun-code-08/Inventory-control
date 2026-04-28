export declare class CreateProductDto {
    productCode: string;
    description: string;
    uom: string;
    shopId: string;
    category: string;
    purchasePrice: number;
    sellingPrice: number;
    minStockLevel: number;
    openingStock: number;
    reorderQty?: number;
    isActive?: boolean;
}
