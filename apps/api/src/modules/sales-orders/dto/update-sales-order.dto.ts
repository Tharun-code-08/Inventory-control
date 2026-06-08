import { ApiPropertyOptional } from '@nestjs/swagger';
import { GstSupplyType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateSalesOrderItemDto } from './create-sales-order.dto';

export class UpdateSalesOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ enum: GstSupplyType, description: 'Auto-derived from GSTIN when omitted' })
  @IsOptional()
  @IsEnum(GstSupplyType)
  gstSupplyType?: GstSupplyType;

  @ApiPropertyOptional({ type: [CreateSalesOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items?: CreateSalesOrderItemDto[];
}
