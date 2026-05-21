import { IntersectionType, ApiPropertyOptional } from '@nestjs/swagger';
import { SalesOrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CursorPageDto } from '../../../common/dto/cursor-page.dto';
import { DateRangeQueryDto } from '../../../common/dto/date-range.dto';

export class ListSalesOrdersDto extends IntersectionType(CursorPageDto, DateRangeQueryDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shop_id?: string;

  @ApiPropertyOptional({ enum: SalesOrderStatus })
  @IsOptional()
  @IsEnum(SalesOrderStatus)
  status?: SalesOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customer_id?: string;
}
