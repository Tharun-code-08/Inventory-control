export declare class CreateSalesQuotationItemDto {
    productId: string;
    quantity: number;
    uom?: string;
    unitPrice: number;
}
export declare class CreateSalesQuotationDto {
    shopId?: string;
    customerId: string;
    quoteDate?: string;
    validUntil?: string;
    remarks?: string;
    items: CreateSalesQuotationItemDto[];
}
