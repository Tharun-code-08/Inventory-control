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

  @ApiPropertyOptional({ enum: ['FULL', 'PARTIAL'], default: 'FULL' })
  @IsOptional()
  @IsIn(['FULL', 'PARTIAL'])
  receiptType?: 'FULL' | 'PARTIAL';

  @ApiPropertyOptional({
    enum: ['PURCHASE_ORDER', 'OUTSIDE'],
    description: 'Inferred from purchaseOrderId when omitted (PO present → PURCHASE_ORDER, else OUTSIDE)',
  })
  @IsOptional()
  @IsIn(['PURCHASE_ORDER', 'OUTSIDE'])
  receiptSource?: 'PURCHASE_ORDER' | 'OUTSIDE';

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

  @ApiPropertyOptional({ description: 'Client-supplied idempotency key (same contract as PO/SO create)' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
