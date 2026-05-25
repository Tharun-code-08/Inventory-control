import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { TaxPreference } from '@prisma/client';
import {
  ArrayMaxSize,
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

export class BulkProductUpsertRowDto {
  @ApiPropertyOptional({ example: 'SKU-001', description: 'Existing SKU to update. Leave blank to create a new product.' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().toUpperCase();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @Matches(/^[A-Z0-9_-]{1,40}$/)
  productCode?: string;

  @ApiPropertyOptional({ example: 'SDC-001', description: 'Plant/shop number or name. Shop users may leave this blank.' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @MaxLength(120)
  shopNumber?: string;

  @ApiPropertyOptional({ example: 'SL-01' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? (value.trim() === '' ? undefined : value.trim()) : value,
  )
  @IsString()
  @MaxLength(60)
  storageLocationCode?: string;

  @ApiProperty({ description: 'Product name / description' })
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  description!: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  @MaxLength(120)
  category!: string;

  @ApiProperty({ example: 'pcs' })
  @Transform(({ value }) => (typeof value === 'string' ? normalizeSpaces(value) : value))
  @IsString()
  @MaxLength(40)
  uom!: string;

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
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = normalizeSpaces(value);
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @MaxLength(120)
  materialGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = normalizeSpaces(value);
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @MaxLength(120)
  drawingReference?: string;

  @ApiPropertyOptional()
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

  @ApiProperty({ description: 'Target stock after import for the selected plant.' })
  @Type(() => Number)
  @Min(0)
  openingStock!: number;

  @ApiProperty()
  @Type(() => Number)
  @Min(0)
  minStockLevel!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxStockLevel?: number;

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

export class BulkProductUpsertDto {
  @ApiPropertyOptional({ default: false, description: 'Validate the rows without committing changes.' })
  @IsOptional()
  @IsBoolean()
  validateOnly?: boolean;

  @ApiProperty({ type: () => [BulkProductUpsertRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => BulkProductUpsertRowDto)
  rows!: BulkProductUpsertRowDto[];
}
