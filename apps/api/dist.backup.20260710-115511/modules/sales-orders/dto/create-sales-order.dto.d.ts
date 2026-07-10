import { GstSupplyType } from '@prisma/client';
export declare class CreateSalesOrderItemDto {
    productId: string;
    quantity: number;
    uom?: string;
    unitPrice: number;
    discountAmount?: number;
    taxRate?: number;
    cgstRate?: number;
    sgstRate?: number;
    igstRate?: number;
}
export declare class CreateSalesOrderDto {
    shopId?: string;
    orderDate?: string;
    expectedDate?: string;
    customerId: string;
    remarks?: string;
    currency?: string;
    fxRateUsed?: number;
    gstSupplyType?: GstSupplyType;
    items: CreateSalesOrderItemDto[];
    idempotencyKey?: string;
}
