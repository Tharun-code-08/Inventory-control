import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { SupplierBillStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CursorPageDto } from '../../../common/dto/cursor-page.dto';
import { DateRangeQueryDto } from '../../../common/dto/date-range.dto';

export class ListSupplierBillsDto extends IntersectionType(CursorPageDto, DateRangeQueryDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shop_id?: string;

  @ApiPropertyOptional({ enum: SupplierBillStatus })
  @IsOptional()
  @IsEnum(SupplierBillStatus)
  status?: SupplierBillStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplier_id?: string;
}
