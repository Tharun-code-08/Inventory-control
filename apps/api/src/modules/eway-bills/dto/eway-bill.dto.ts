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
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EwayBillStatus,
  EwaySupplyType,
  EwaySubType,
  EwayTransactionType,
  EwayDocumentType,
  EwayTransportMode,
  EwayVehicleType,
} from '@prisma/client';

// ─── Item ────────────────────────────────────────────────────────────────────

export class EwayBillItemDto {
  @ApiPropertyOptional({ description: 'Product master ID (optional — free-text allowed)' })
  @IsUUID() @IsOptional() productId?: string;

  @ApiProperty({ example: 'Basmati Rice 5kg' })
  @IsString() productName: string;

  @ApiPropertyOptional({ example: 'Premium long-grain basmati rice' })
  @IsString() @IsOptional() description?: string;

  @ApiProperty({ example: '1006' })
  @IsString() hsnCode: string;

  @ApiProperty({ example: 10 })
  @IsNumber() @Min(0.001) quantity: number;

  @ApiProperty({ example: 'PCS' })
  @IsString() unit: string;

  @ApiProperty({ example: 5000 })
  @IsNumber() @Min(0) taxableAmount: number;

  @ApiProperty({ example: 5, description: 'Total GST rate (CGST+SGST or IGST)' })
  @IsNumber() @Min(0) gstRate: number;

  @ApiPropertyOptional({ example: 125 })
  @IsNumber() @Min(0) @IsOptional() cgst?: number;

  @ApiPropertyOptional({ example: 125 })
  @IsNumber() @Min(0) @IsOptional() sgst?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber() @Min(0) @IsOptional() igst?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber() @Min(0) @IsOptional() cess?: number;

  @ApiProperty({ example: 5250 })
  @IsNumber() @Min(0) total: number;
}

// ─── Create ──────────────────────────────────────────────────────────────────

export class CreateEwayBillDto {
  // Relations
  @ApiPropertyOptional() @IsUUID() @IsOptional() shopId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() invoiceId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() salesOrderId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() customerId?: string;

  // Transaction
  @ApiProperty({ enum: EwaySupplyType, default: 'OUTWARD' })
  @IsEnum(EwaySupplyType) @IsOptional() supplyType?: EwaySupplyType;

  @ApiProperty({ enum: EwaySubType, default: 'SUPPLY' })
  @IsEnum(EwaySubType) @IsOptional() subType?: EwaySubType;

  @ApiProperty({ enum: EwayTransactionType, default: 'REGULAR' })
  @IsEnum(EwayTransactionType) @IsOptional() transactionType?: EwayTransactionType;

  @ApiProperty({ enum: EwayDocumentType, default: 'TAX_INVOICE' })
  @IsEnum(EwayDocumentType) @IsOptional() documentType?: EwayDocumentType;

  @ApiProperty({ example: 'INV-2026-001' })
  @IsString() documentNumber: string;

  @ApiProperty({ example: '2026-06-16' })
  @IsDateString() documentDate: string;

  // Dispatch From
  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5' }) @IsString() @IsOptional() fromGstin?: string;
  @ApiProperty({ example: 'Acme Retail Pvt Ltd' }) @IsString() fromName: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fromAddress1?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fromAddress2?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fromPlace?: string;
  @ApiPropertyOptional({ example: '560001' }) @IsString() @IsOptional() fromPincode?: string;
  @ApiPropertyOptional({ example: '29' }) @IsString() @IsOptional() fromStateCode?: string;

  // Ship To
  @ApiPropertyOptional({ example: '27XYZAB5678G2A1' }) @IsString() @IsOptional() toGstin?: string;
  @ApiProperty({ example: 'ABC Traders' }) @IsString() toName: string;
  @ApiPropertyOptional() @IsString() @IsOptional() toAddress1?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() toAddress2?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() toPlace?: string;
  @ApiPropertyOptional({ example: '400001' }) @IsString() @IsOptional() toPincode?: string;
  @ApiPropertyOptional({ example: '27' }) @IsString() @IsOptional() toStateCode?: string;

  // Transport
  @ApiPropertyOptional() @IsString() @IsOptional() transporterGstin?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() transporterName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() transporterId?: string;
  @ApiPropertyOptional({ enum: EwayTransportMode, default: 'ROAD' })
  @IsEnum(EwayTransportMode) @IsOptional() transportMode?: EwayTransportMode;
  @ApiPropertyOptional() @IsString() @IsOptional() transDocNumber?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() transDocDate?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() vehicleNumber?: string;
  @ApiPropertyOptional({ enum: EwayVehicleType, default: 'REGULAR' })
  @IsEnum(EwayVehicleType) @IsOptional() vehicleType?: EwayVehicleType;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() distanceKm?: number;

  // Items
  @ApiPropertyOptional({ type: [EwayBillItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => EwayBillItemDto) @IsOptional()
  items?: EwayBillItemDto[];

  @ApiPropertyOptional() @IsString() @IsOptional() remarks?: string;
}

// ─── Update ──────────────────────────────────────────────────────────────────

export class UpdateEwayBillDto {
  @ApiPropertyOptional({ enum: EwaySupplyType })
  @IsEnum(EwaySupplyType) @IsOptional() supplyType?: EwaySupplyType;

  @ApiPropertyOptional({ enum: EwaySubType })
  @IsEnum(EwaySubType) @IsOptional() subType?: EwaySubType;

  @ApiPropertyOptional({ enum: EwayTransactionType })
  @IsEnum(EwayTransactionType) @IsOptional() transactionType?: EwayTransactionType;

  @ApiPropertyOptional({ enum: EwayDocumentType })
  @IsEnum(EwayDocumentType) @IsOptional() documentType?: EwayDocumentType;

  @ApiPropertyOptional() @IsString() @IsOptional() documentNumber?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() documentDate?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() fromGstin?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fromName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fromAddress1?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fromAddress2?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fromPlace?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fromPincode?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fromStateCode?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() toGstin?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() toName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() toAddress1?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() toAddress2?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() toPlace?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() toPincode?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() toStateCode?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() transporterGstin?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() transporterName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() transporterId?: string;
  @ApiPropertyOptional({ enum: EwayTransportMode })
  @IsEnum(EwayTransportMode) @IsOptional() transportMode?: EwayTransportMode;
  @ApiPropertyOptional() @IsString() @IsOptional() transDocNumber?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() transDocDate?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() vehicleNumber?: string;
  @ApiPropertyOptional({ enum: EwayVehicleType })
  @IsEnum(EwayVehicleType) @IsOptional() vehicleType?: EwayVehicleType;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() distanceKm?: number;

  @ApiPropertyOptional({ type: [EwayBillItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => EwayBillItemDto) @IsOptional()
  items?: EwayBillItemDto[];

  @ApiPropertyOptional() @IsString() @IsOptional() remarks?: string;
}

// ─── From Invoice / Sales Order ──────────────────────────────────────────────

export class GenerateFromInvoiceDto {
  @ApiProperty({ description: 'Invoice to build the e-way bill from' })
  @IsUUID() invoiceId: string;

  @ApiPropertyOptional({ enum: EwayTransportMode, default: 'ROAD' })
  @IsEnum(EwayTransportMode) @IsOptional() transportMode?: EwayTransportMode;

  @ApiPropertyOptional() @IsString() @IsOptional() transporterGstin?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() transporterName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() transDocNumber?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() transDocDate?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() vehicleNumber?: string;
  @ApiPropertyOptional({ enum: EwayVehicleType, default: 'REGULAR' })
  @IsEnum(EwayVehicleType) @IsOptional() vehicleType?: EwayVehicleType;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() distanceKm?: number;
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export class CancelEwayBillDto {
  @ApiProperty({ example: 'Duplicate bill' })
  @IsString() reason: string;
}

// ─── Filter ──────────────────────────────────────────────────────────────────

export class EwayBillFilterDto {
  @ApiPropertyOptional({ enum: EwayBillStatus })
  @IsEnum(EwayBillStatus) @IsOptional() status?: EwayBillStatus;

  @ApiPropertyOptional() @IsUUID() @IsOptional() customerId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsDateString() @IsOptional() fromDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString() @IsOptional() toDate?: string;
}
