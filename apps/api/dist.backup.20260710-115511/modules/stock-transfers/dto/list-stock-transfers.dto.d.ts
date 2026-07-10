import { DocumentStatus } from '@prisma/client';
export declare class ListStockTransfersDto {
    from_shop_id?: string;
    to_shop_id?: string;
    date_from?: string;
    date_to?: string;
    status?: DocumentStatus;
    cursor?: string;
    take?: number;
}
