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

class StockTransferLineDto {
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
}

export class CreateStockTransferDto {
  @ApiProperty()
  @IsUUID()
  fromShopId!: string;

  @ApiProperty()
  @IsUUID()
  toShopId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fromStorageLocationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  toStorageLocationId?: string;

  @ApiProperty({ example: '2026-05-26' })
  @IsDateString()
  transferDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [StockTransferLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockTransferLineDto)
  items!: StockTransferLineDto[];
}
