export declare class CreateRfqItemDto {
    productId?: string;
    description?: string;
    quantity: number;
    uom?: string;
    specifications?: string;
}
export declare class CreateRfqDto {
    shopId?: string;
    rfqDate?: string;
    deadline?: string;
    title: string;
    notes?: string;
    suppliers?: string[];
    items: CreateRfqItemDto[];
}
