import { GstSupplyType } from '@prisma/client';
import { CreateSalesOrderItemDto } from './create-sales-order.dto';
export declare class UpdateSalesOrderDto {
    orderDate?: string;
    expectedDate?: string;
    customerId?: string;
    remarks?: string;
    gstSupplyType?: GstSupplyType;
    items?: CreateSalesOrderItemDto[];
}
