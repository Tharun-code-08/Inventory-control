import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * One plant assignment for a product. A product is stocked at zero or more
 * plants; each assignment carries the per-plant storage location and stock
 * thresholds. The (productId, shopId) tuple is enforced unique at the DB
 * level so the same product is never assigned to the same plant twice.
 */
export class ProductPlantDto {
  @ApiProperty({ description: 'Plant (shop) the product is being assigned to.' })
  @IsUUID()
  shopId!: string;

  @ApiPropertyOptional({ description: 'Optional storage location within the plant.' })
  @IsOptional()
  @IsUUID()
  storageLocationId?: string;

  @ApiProperty({ description: 'Opening stock seeded as an OPENING ledger entry on create.' })
  @Type(() => Number)
  @Min(0)
  openingStock!: number;

  @ApiPropertyOptional({ description: 'Batch number for opening stock (required when openingStock > 0).' })
  @ValidateIf((plant) => Number(plant.openingStock) > 0)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'Expiry date for opening stock (YYYY-MM-DD, required when openingStock > 0).' })
  @ValidateIf((plant) => Number(plant.openingStock) > 0)
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ description: 'Per-plant minimum stock level used by reorder alerts.' })
  @Type(() => Number)
  @Min(0)
  minStockLevel!: number;

  @ApiPropertyOptional({ description: 'Optional per-plant maximum stock level.' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxStockLevel?: number;

  @ApiPropertyOptional({ description: 'Optional per-plant reorder quantity.' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  reorderQty?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
