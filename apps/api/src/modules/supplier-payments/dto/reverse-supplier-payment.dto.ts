import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReverseSupplierPaymentDto {
  @ApiPropertyOptional({ description: 'Reason recorded on the reversal audit trail' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
