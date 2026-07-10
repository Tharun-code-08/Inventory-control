export declare class CreateQuotationItemDto {
    rfqItemId?: string;
    productId?: string;
    description?: string;
    quantity: number;
    uom?: string;
    specifications?: string;
    unitPrice: number;
}
export declare class CreateQuotationDto {
    rfqId: string;
    supplierId: string;
    quoteDate?: string;
    notes?: string;
    items: CreateQuotationItemDto[];
}
