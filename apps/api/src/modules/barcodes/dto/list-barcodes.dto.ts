import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { BarcodeType } from '@prisma/client';

export class ListBarcodesDto {
  @ApiPropertyOptional({ description: 'Substring match on barcode value or product name/code.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: BarcodeType })
  @IsOptional()
  @IsEnum(BarcodeType)
  barcodeType?: BarcodeType;

  @ApiPropertyOptional({ description: 'Filter by supplier' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
