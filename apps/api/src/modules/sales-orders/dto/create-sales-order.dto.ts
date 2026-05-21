import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class CreateSalesOrderItemDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @Type(() => Number)
  @Min(0.0001)
  quantity!: number;

  @ApiPropertyOptional({ default: 'UNIT' })
  @IsOptional()
  @IsString()
  uom?: string;

  @ApiProperty()
  @Type(() => Number)
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ description: 'Per-line discount amount (in line currency)' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Tax rate as a decimal (e.g. 0.18 for 18%)' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  taxRate?: number;
}

export class CreateSalesOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Snapshot FX rate vs the shop functional currency at create time',
  })
  @IsOptional()
  @Type(() => Number)
  fxRateUsed?: number;

  @ApiProperty({ type: [CreateSalesOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items!: CreateSalesOrderItemDto[];
}

