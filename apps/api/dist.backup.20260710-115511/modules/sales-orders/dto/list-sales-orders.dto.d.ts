import { SalesOrderStatus } from '@prisma/client';
import { CursorPageDto } from '../../../common/dto/cursor-page.dto';
import { DateRangeQueryDto } from '../../../common/dto/date-range.dto';
declare const ListSalesOrdersDto_base: import("@nestjs/common").Type<CursorPageDto & DateRangeQueryDto>;
export declare class ListSalesOrdersDto extends ListSalesOrdersDto_base {
    shop_id?: string;
    status?: SalesOrderStatus;
    customer_id?: string;
}
export {};
