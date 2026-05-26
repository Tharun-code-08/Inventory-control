import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSupplierBillDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  billDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
