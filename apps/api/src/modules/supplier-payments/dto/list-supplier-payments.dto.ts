import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CursorPageDto } from '../../../common/dto/cursor-page.dto';

export class ListSupplierPaymentsDto extends CursorPageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplier_bill_id?: string;
}
