import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CursorPageDto } from '../../../common/dto/cursor-page.dto';

export class ListPaymentsDto extends CursorPageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  invoice_id?: string;
}
