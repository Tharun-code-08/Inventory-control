import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScanAction, ScanSource } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class LookupBarcodeDto {
  @ApiProperty({ description: 'Scanned barcode value' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  code!: string;

  @ApiPropertyOptional({ enum: ScanAction, default: ScanAction.LOOKUP })
  @IsOptional()
  @IsEnum(ScanAction)
  action?: ScanAction;

  @ApiPropertyOptional({ description: 'Shop context for the scan (audit only)' })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional({ enum: ScanSource, default: ScanSource.API, description: 'Scan channel for adoption analytics' })
  @IsOptional()
  @IsEnum(ScanSource)
  source?: ScanSource;
}
