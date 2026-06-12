import { ApiPropertyOptional } from '@nestjs/swagger';
import { BarcodeType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateBarcodeDto {
  @ApiPropertyOptional({ enum: BarcodeType })
  @IsOptional()
  @IsEnum(BarcodeType)
  barcodeType?: BarcodeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Optional supplier ID. Set to null to clear connection.' })
  @IsOptional()
  @IsString()
  supplierId?: string | null;
}
