import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateSupplierPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiProperty()
  @IsUUID()
  supplierBillId!: string;

  @ApiProperty()
  @Type(() => Number)
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
