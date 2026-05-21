import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSupplierReturnItemDto {
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
  unitCost!: number;
}

export class CreateSupplierReturnDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiProperty()
  @IsString()
  supplierName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({ type: [CreateSupplierReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierReturnItemDto)
  items!: CreateSupplierReturnItemDto[];
}
