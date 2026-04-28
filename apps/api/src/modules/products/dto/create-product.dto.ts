import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { normalizeSpaces } from '../../../common/utils/normalize';

export class CreateProductDto {
  @ApiProperty({ example: 'SKU-001' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z0-9_-]{1,20}$/)
  productCode!: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  description!: string;

  @ApiProperty({ example: 'UNIT' })
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  uom!: string;

  @ApiProperty()
  @IsUUID()
  shopId!: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  category!: string;

  @ApiProperty()
  @Type(() => Number)
  @Min(0)
  purchasePrice!: number;

  @ApiProperty()
  @Type(() => Number)
  @Min(0)
  sellingPrice!: number;

  @ApiProperty()
  @Type(() => Number)
  @Min(0)
  minStockLevel!: number;

  @ApiProperty()
  @Type(() => Number)
  @Min(0)
  openingStock!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  reorderQty?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
