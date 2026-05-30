import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VoidSupplierBillDto {
  @ApiPropertyOptional({ description: 'Reason recorded on the void audit trail' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
