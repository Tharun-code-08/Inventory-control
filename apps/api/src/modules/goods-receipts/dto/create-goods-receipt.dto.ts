import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class GoodsReceiptLineDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @Type(() => Number)
  @Min(0.0001)
  quantity!: number;

  @ApiProperty()
  @IsString()
  uom!: string;

  @ApiProperty()
  @Type(() => Number)
  @Min(0)
  purchaseRate!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty()
  @IsUUID()
  storageLocationId!: string;
}

export class CreateGoodsReceiptDto {
  @ApiProperty()
  @IsDateString()
  grDate!: string;

  @ApiProperty()
  @IsUUID()
  shopId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @ApiProperty({ enum: ['FULL', 'PARTIAL'], default: 'FULL' })
  @IsIn(['FULL', 'PARTIAL'])
  receiptType!: 'FULL' | 'PARTIAL';

  @ApiProperty({ enum: ['PURCHASE_ORDER', 'OUTSIDE'], default: 'PURCHASE_ORDER' })
  @IsIn(['PURCHASE_ORDER', 'OUTSIDE'])
  receiptSource!: 'PURCHASE_ORDER' | 'OUTSIDE';

  @ApiPropertyOptional({ enum: ['DAY_SHIFT', 'NIGHT_SHIFT'] })
  @IsOptional()
  @IsIn(['DAY_SHIFT', 'NIGHT_SHIFT'])
  inwardShift?: 'DAY_SHIFT' | 'NIGHT_SHIFT';

  @ApiProperty()
  @IsString()
  supplierName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({ type: [GoodsReceiptLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptLineDto)
  items!: GoodsReceiptLineDto[];
}
