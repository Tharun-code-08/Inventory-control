import { SupplierBillStatus } from '@prisma/client';
import { CursorPageDto } from '../../../common/dto/cursor-page.dto';
import { DateRangeQueryDto } from '../../../common/dto/date-range.dto';
declare const ListSupplierBillsDto_base: import("@nestjs/common").Type<CursorPageDto & DateRangeQueryDto>;
export declare class ListSupplierBillsDto extends ListSupplierBillsDto_base {
    shop_id?: string;
    status?: SupplierBillStatus;
    supplier_id?: string;
}
export {};
