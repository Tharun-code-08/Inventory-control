import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';
import { EwayBillStatus, EwaySupplyType, EwayTransportMode } from '@prisma/client';

export class CreateEwayBillDto {
  @ApiPropertyOptional({ description: 'Shop the bill belongs to (defaults to the user shop)' })
  @IsUUID()
  @IsOptional()
  shopId?: string;

  @ApiPropertyOptional({ description: 'Source invoice id, if generated from an invoice' })
  @IsUUID()
  @IsOptional()
  invoiceId?: string;

  @ApiProperty({ enum: EwaySupplyType, default: 'OUTWARD' })
  @IsEnum(EwaySupplyType)
  @IsOptional()
  supplyType?: EwaySupplyType;

  @ApiPropertyOptional({ default: 'TAX_INVOICE' })
  @IsString()
  @IsOptional()
  documentType?: string;

  @ApiProperty({ example: 'INV-2026-001' })
  @IsString()
  documentNumber: string;

  @ApiProperty({ example: '2026-06-16' })
  @IsDateString()
  documentDate: string;

  // Consignor (from)
  @ApiPropertyOptional() @IsString() @IsOptional() fromGstin?: string;
  @ApiProperty() @IsString() fromName: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fromAddress?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fromPlace?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fromPincode?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fromStateCode?: string;

  // Consignee (to)
  @ApiPropertyOptional() @IsString() @IsOptional() toGstin?: string;
  @ApiProperty() @IsString() toName: string;
  @ApiPropertyOptional() @IsString() @IsOptional() toAddress?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() toPlace?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() toPincode?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() toStateCode?: string;

  // Transport
  @ApiPropertyOptional() @IsString() @IsOptional() transporterName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() transporterId?: string;
  @ApiPropertyOptional({ enum: EwayTransportMode, default: 'ROAD' })
  @IsEnum(EwayTransportMode)
  @IsOptional()
  transportMode?: EwayTransportMode;
  @ApiPropertyOptional() @IsString() @IsOptional() vehicleNumber?: string;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() distanceKm?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() transDocNumber?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() transDocDate?: string;

  // Values
  @ApiPropertyOptional() @IsNumber() @IsOptional() taxableValue?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() cgstValue?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() sgstValue?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() igstValue?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() cessValue?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() totalValue?: number;

  @ApiPropertyOptional() @IsString() @IsOptional() remarks?: string;
}

export class UpdateEwayBillDto extends CreateEwayBillDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare documentNumber: string;
}

export class GenerateFromInvoiceDto {
  @ApiProperty({ description: 'Invoice to build the e-way bill from' })
  @IsUUID()
  invoiceId: string;

  @ApiPropertyOptional({ enum: EwayTransportMode, default: 'ROAD' })
  @IsEnum(EwayTransportMode)
  @IsOptional()
  transportMode?: EwayTransportMode;

  @ApiPropertyOptional() @IsString() @IsOptional() transporterName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() vehicleNumber?: string;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() distanceKm?: number;
}

export class CancelEwayBillDto {
  @ApiProperty({ example: 'Order cancelled by customer' })
  @IsString()
  reason: string;
}

export class EwayBillFilterDto {
  @ApiPropertyOptional({ enum: EwayBillStatus })
  @IsEnum(EwayBillStatus)
  @IsOptional()
  status?: EwayBillStatus;
}
