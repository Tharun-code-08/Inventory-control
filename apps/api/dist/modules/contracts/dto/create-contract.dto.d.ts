export declare class CreateContractItemDto {
    productId?: string;
    description?: string;
    quantity: number;
    uom?: string;
    unitPrice: number;
}
export declare class CreateContractDto {
    shopId?: string;
    supplierId: string;
    rfqId?: string;
    title: string;
    paymentTerms?: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
    items: CreateContractItemDto[];
}
