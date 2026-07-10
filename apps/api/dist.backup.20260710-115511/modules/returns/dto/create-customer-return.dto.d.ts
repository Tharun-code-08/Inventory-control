export declare class CreateCustomerReturnItemDto {
    productId: string;
    quantity: number;
    uom?: string;
    unitPrice: number;
}
export declare class CreateCustomerReturnDto {
    shopId?: string;
    returnDate?: string;
    customerId: string;
    invoiceId?: string;
    salesOrderId?: string;
    reason?: string;
    remarks?: string;
    items: CreateCustomerReturnItemDto[];
}
