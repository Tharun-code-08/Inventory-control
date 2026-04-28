export declare class CreateSalesOrderItemDto {
    productId: string;
    quantity: number;
    uom?: string;
    unitPrice: number;
}
export declare class CreateSalesOrderDto {
    shopId?: string;
    orderDate?: string;
    expectedDate?: string;
    customerId: string;
    remarks?: string;
    items: CreateSalesOrderItemDto[];
}
