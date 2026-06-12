import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScanAction, ScanSource } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class MarkInvalidBarcodeDto {
  @ApiProperty({ description: 'Raw scanned barcode value that was determined invalid' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ enum: ScanAction, default: ScanAction.LOOKUP })
  @IsOptional()
  @IsEnum(ScanAction)
  action?: ScanAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional({ enum: ScanSource, default: ScanSource.API })
  @IsOptional()
  @IsEnum(ScanSource)
  source?: ScanSource;
}
