import { InvoiceStatus } from '@prisma/client';
import { CursorPageDto } from '../../../common/dto/cursor-page.dto';
import { DateRangeQueryDto } from '../../../common/dto/date-range.dto';
declare const ListInvoicesDto_base: import("@nestjs/common").Type<CursorPageDto & DateRangeQueryDto>;
export declare class ListInvoicesDto extends ListInvoicesDto_base {
    shop_id?: string;
    status?: InvoiceStatus;
    customer_id?: string;
}
export {};
