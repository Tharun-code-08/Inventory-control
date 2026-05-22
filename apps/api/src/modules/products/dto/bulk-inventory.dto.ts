import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * One row of a bulk-inventory CSV upload.
 * Key columns: productCode + shopNumber identify the ProductPlant assignment.
 * Optional storageLocationCode is matched against StorageLocation.code within
 * that plant; min/max/reorder are written if present.
 */
export class BulkInventoryRowDto {
  @ApiProperty({ example: 'SKU-001' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(40)
  productCode!: string;

  @ApiProperty({ example: 'BMW-001' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(60)
  shopNumber!: string;

  @ApiPropertyOptional({ example: 'SL-01' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? (value.trim() === '' ? undefined : value.trim()) : value,
  )
  @IsString()
  @MaxLength(60)
  storageLocationCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  reorderQty?: number;
}

export class BulkInventoryDto {
  @ApiProperty({ type: () => [BulkInventoryRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => BulkInventoryRowDto)
  rows!: BulkInventoryRowDto[];
}
