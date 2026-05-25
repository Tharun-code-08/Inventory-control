import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { SupplierReturnReasonCode } from '@prisma/client';

export class CreateSupplierReturnItemDto {
  @ApiProperty()
  @IsUUID()
  goodsReceiptItemId!: string;

  @ApiProperty({ description: 'Quantity to return from the selected goods receipt line' })
  @Type(() => Number)
  @Min(0.0001)
  returnQty!: number;

  @ApiProperty({ enum: SupplierReturnReasonCode })
  @IsEnum(SupplierReturnReasonCode)
  reasonCode!: SupplierReturnReasonCode;
}

export class CreateSupplierReturnDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiProperty()
  @IsUUID()
  goodsReceiptId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  internalCcEmail?: string;

  @ApiProperty({ type: [CreateSupplierReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierReturnItemDto)
  items!: CreateSupplierReturnItemDto[];
}
