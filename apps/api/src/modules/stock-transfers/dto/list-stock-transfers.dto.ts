import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ListStockTransfersDto {
  @ApiPropertyOptional({ description: 'Filter by source shop (respects user scope)' })
  @IsOptional()
  @IsUUID()
  from_shop_id?: string;

  @ApiPropertyOptional({ description: 'Filter by destination shop (respects user scope)' })
  @IsOptional()
  @IsUUID()
  to_shop_id?: string;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ example: '2026-05-31' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  take?: number;
}
