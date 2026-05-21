import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PurchaseOrderStatus } from '@prisma/client';

export class ListPurchaseOrdersDto {
  @ApiPropertyOptional({ description: 'Filter by shop (respects user scope)' })
  @IsOptional()
  @IsUUID()
  shop_id?: string;

  @ApiPropertyOptional({ description: 'Search PO number or supplier', example: 'PO-202405 / Bosch' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({ description: 'Page number (1-indexed)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page (1-100)', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  // Backwards-compatible cursor/take knobs for existing clients.
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
