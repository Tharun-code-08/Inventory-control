import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

class PoLine {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ description: 'RFQ line this PO line fulfills' })
  @IsOptional()
  @IsUUID()
  rfqItemId?: string;

  @ApiProperty()
  @Type(() => Number)
  @Min(0.0001)
  orderQty!: number;

  @ApiProperty()
  @Type(() => Number)
  @Min(0)
  rate!: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsDateString()
  poDate!: string;

  @ApiProperty()
  @IsUUID()
  shopId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @ApiPropertyOptional({ description: 'RFQ that this PO fulfills' })
  @IsOptional()
  @IsUUID()
  rfqId?: string;

  @ApiProperty()
  @IsString()
  supplier!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({ type: [PoLine] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PoLine)
  items!: PoLine[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: 'If true, email the PO to the supplier after creation' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  sendToSupplier?: boolean;
}
