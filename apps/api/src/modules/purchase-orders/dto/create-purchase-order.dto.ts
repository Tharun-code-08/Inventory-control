import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

class PoLine {
  @ApiPropertyOptional({ description: 'Optional when lineDescription is provided (service line)' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Custom description to print on the PO line' })
  @IsOptional()
  @IsString()
  lineDescription?: string;

  @ApiPropertyOptional({ description: 'Optional line category (e.g., Service)' })
  @IsOptional()
  @IsString()
  lineCategory?: string;

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
  @ApiPropertyOptional({ description: 'Optional manual PO number (must be unique)' })
  @IsOptional()
  @IsString()
  poNumber?: string;

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

  @ApiPropertyOptional({ description: 'If true, create as CONFIRMED when sending to supplier' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  confirmOnSend?: boolean;
}
