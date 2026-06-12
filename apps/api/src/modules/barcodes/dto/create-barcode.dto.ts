import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BarcodeType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBarcodeDto {
  @ApiProperty({ description: 'Raw barcode value (normalized server-side)' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  barcodeValue!: string;

  @ApiPropertyOptional({ enum: BarcodeType, default: BarcodeType.CODE128 })
  @IsOptional()
  @IsEnum(BarcodeType)
  barcodeType?: BarcodeType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Optional ID of the supplier' })
  @IsOptional()
  @IsString()
  supplierId?: string;
}
