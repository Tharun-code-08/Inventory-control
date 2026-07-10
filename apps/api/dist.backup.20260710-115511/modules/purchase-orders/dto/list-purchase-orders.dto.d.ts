import { PurchaseOrderStatus } from '@prisma/client';
export declare class ListPurchaseOrdersDto {
    shop_id?: string;
    search?: string;
    status?: PurchaseOrderStatus;
    page?: number;
    limit?: number;
    cursor?: string;
    take?: number;
}
