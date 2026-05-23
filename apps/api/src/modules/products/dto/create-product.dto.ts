import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { TaxPreference } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { normalizeSpaces } from '../../../common/utils/normalize';
import { ProductPlantDto } from './product-plant.dto';
import { ProductSpecificationDto } from './product-specification.dto';

/**
 * Create-product payload. The product master is plant-agnostic; the per-plant
 * stock thresholds live on `plants`. At least one plant assignment is required
 * because a product with no plant cannot be transacted against.
 */
export class CreateProductDto {
  @ApiProperty({ example: 'SKU-001' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z0-9_-]{1,40}$/)
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
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  category!: string;

  @ApiPropertyOptional({ description: 'Harmonized System of Nomenclature code (4, 6, or 8 digits)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @Matches(/^\d{4}(\d{2}){0,2}$/, { message: 'HSN code must be 4, 6, or 8 digits' })
  hsnCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  @MaxLength(120)
  materialGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  @MaxLength(120)
  drawingReference?: string;

  @ApiPropertyOptional({ example: 'Bosch' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = normalizeSpaces(value);
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @MaxLength(120)
  brand?: string;

  @ApiPropertyOptional({ enum: TaxPreference, default: TaxPreference.TAXABLE })
  @IsOptional()
  @IsEnum(TaxPreference)
  taxPreference?: TaxPreference;

  @ApiProperty()
  @Type(() => Number)
  @Min(0)
  purchasePrice!: number;

  @ApiProperty()
  @Type(() => Number)
  @Min(0)
  sellingPrice!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: () => [ProductPlantDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductPlantDto)
  plants!: ProductPlantDto[];

  @ApiPropertyOptional({ type: () => [ProductSpecificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecificationDto)
  specifications?: ProductSpecificationDto[];
}
