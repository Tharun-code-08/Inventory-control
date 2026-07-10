"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EwayBillFilterDto = exports.CancelEwayBillDto = exports.GenerateFromInvoiceDto = exports.UpdateEwayBillDto = exports.CreateEwayBillDto = exports.EwayBillItemDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
class EwayBillItemDto {
    productId;
    productName;
    description;
    hsnCode;
    quantity;
    unit;
    taxableAmount;
    gstRate;
    cgst;
    sgst;
    igst;
    cess;
    total;
}
exports.EwayBillItemDto = EwayBillItemDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Product master ID (optional — free-text allowed)' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EwayBillItemDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Basmati Rice 5kg' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EwayBillItemDto.prototype, "productName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Premium long-grain basmati rice' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EwayBillItemDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1006' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EwayBillItemDto.prototype, "hsnCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.001),
    __metadata("design:type", Number)
], EwayBillItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'PCS' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EwayBillItemDto.prototype, "unit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5000 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], EwayBillItemDto.prototype, "taxableAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5, description: 'Total GST rate (CGST+SGST or IGST)' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], EwayBillItemDto.prototype, "gstRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 125 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EwayBillItemDto.prototype, "cgst", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 125 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EwayBillItemDto.prototype, "sgst", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EwayBillItemDto.prototype, "igst", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EwayBillItemDto.prototype, "cess", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5250 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], EwayBillItemDto.prototype, "total", void 0);
class CreateEwayBillDto {
    shopId;
    invoiceId;
    salesOrderId;
    customerId;
    supplyType;
    subType;
    transactionType;
    documentType;
    documentNumber;
    documentDate;
    fromGstin;
    fromName;
    fromAddress1;
    fromAddress2;
    fromPlace;
    fromPincode;
    fromStateCode;
    toGstin;
    toName;
    toAddress1;
    toAddress2;
    toPlace;
    toPincode;
    toStateCode;
    transporterGstin;
    transporterName;
    transporterId;
    transportMode;
    transDocNumber;
    transDocDate;
    vehicleNumber;
    vehicleType;
    distanceKm;
    items;
    remarks;
}
exports.CreateEwayBillDto = CreateEwayBillDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "shopId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "invoiceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "salesOrderId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.EwaySupplyType, default: 'OUTWARD' }),
    (0, class_validator_1.IsEnum)(client_1.EwaySupplyType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "supplyType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.EwaySubType, default: 'SUPPLY' }),
    (0, class_validator_1.IsEnum)(client_1.EwaySubType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "subType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.EwayTransactionType, default: 'REGULAR' }),
    (0, class_validator_1.IsEnum)(client_1.EwayTransactionType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "transactionType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.EwayDocumentType, default: 'TAX_INVOICE' }),
    (0, class_validator_1.IsEnum)(client_1.EwayDocumentType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'INV-2026-001' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "documentNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-06-16' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "documentDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '29ABCDE1234F1Z5' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "fromGstin", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Acme Retail Pvt Ltd' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "fromName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "fromAddress1", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "fromAddress2", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "fromPlace", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '560001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "fromPincode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '29' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "fromStateCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '27XYZAB5678G2A1' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "toGstin", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ABC Traders' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "toName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "toAddress1", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "toAddress2", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "toPlace", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '400001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "toPincode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '27' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "toStateCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "transporterGstin", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "transporterName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "transporterId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.EwayTransportMode, default: 'ROAD' }),
    (0, class_validator_1.IsEnum)(client_1.EwayTransportMode),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "transportMode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "transDocNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "transDocDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "vehicleNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.EwayVehicleType, default: 'REGULAR' }),
    (0, class_validator_1.IsEnum)(client_1.EwayVehicleType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "vehicleType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateEwayBillDto.prototype, "distanceKm", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [EwayBillItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => EwayBillItemDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateEwayBillDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateEwayBillDto.prototype, "remarks", void 0);
class UpdateEwayBillDto {
    supplyType;
    subType;
    transactionType;
    documentType;
    documentNumber;
    documentDate;
    fromGstin;
    fromName;
    fromAddress1;
    fromAddress2;
    fromPlace;
    fromPincode;
    fromStateCode;
    toGstin;
    toName;
    toAddress1;
    toAddress2;
    toPlace;
    toPincode;
    toStateCode;
    transporterGstin;
    transporterName;
    transporterId;
    transportMode;
    transDocNumber;
    transDocDate;
    vehicleNumber;
    vehicleType;
    distanceKm;
    items;
    remarks;
}
exports.UpdateEwayBillDto = UpdateEwayBillDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.EwaySupplyType }),
    (0, class_validator_1.IsEnum)(client_1.EwaySupplyType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "supplyType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.EwaySubType }),
    (0, class_validator_1.IsEnum)(client_1.EwaySubType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "subType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.EwayTransactionType }),
    (0, class_validator_1.IsEnum)(client_1.EwayTransactionType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "transactionType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.EwayDocumentType }),
    (0, class_validator_1.IsEnum)(client_1.EwayDocumentType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "documentNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "documentDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "fromGstin", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "fromName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "fromAddress1", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "fromAddress2", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "fromPlace", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "fromPincode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "fromStateCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "toGstin", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "toName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "toAddress1", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "toAddress2", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "toPlace", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "toPincode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "toStateCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "transporterGstin", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "transporterName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "transporterId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.EwayTransportMode }),
    (0, class_validator_1.IsEnum)(client_1.EwayTransportMode),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "transportMode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "transDocNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "transDocDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "vehicleNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.EwayVehicleType }),
    (0, class_validator_1.IsEnum)(client_1.EwayVehicleType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "vehicleType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateEwayBillDto.prototype, "distanceKm", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [EwayBillItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => EwayBillItemDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdateEwayBillDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateEwayBillDto.prototype, "remarks", void 0);
class GenerateFromInvoiceDto {
    invoiceId;
    transportMode;
    transporterGstin;
    transporterName;
    transDocNumber;
    transDocDate;
    vehicleNumber;
    vehicleType;
    distanceKm;
}
exports.GenerateFromInvoiceDto = GenerateFromInvoiceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Invoice to build the e-way bill from' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GenerateFromInvoiceDto.prototype, "invoiceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.EwayTransportMode, default: 'ROAD' }),
    (0, class_validator_1.IsEnum)(client_1.EwayTransportMode),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateFromInvoiceDto.prototype, "transportMode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateFromInvoiceDto.prototype, "transporterGstin", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateFromInvoiceDto.prototype, "transporterName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateFromInvoiceDto.prototype, "transDocNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateFromInvoiceDto.prototype, "transDocDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateFromInvoiceDto.prototype, "vehicleNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.EwayVehicleType, default: 'REGULAR' }),
    (0, class_validator_1.IsEnum)(client_1.EwayVehicleType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateFromInvoiceDto.prototype, "vehicleType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], GenerateFromInvoiceDto.prototype, "distanceKm", void 0);
class CancelEwayBillDto {
    reason;
}
exports.CancelEwayBillDto = CancelEwayBillDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Duplicate bill' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CancelEwayBillDto.prototype, "reason", void 0);
class EwayBillFilterDto {
    status;
    customerId;
    fromDate;
    toDate;
}
exports.EwayBillFilterDto = EwayBillFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.EwayBillStatus }),
    (0, class_validator_1.IsEnum)(client_1.EwayBillStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EwayBillFilterDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EwayBillFilterDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-01-01' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EwayBillFilterDto.prototype, "fromDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-12-31' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EwayBillFilterDto.prototype, "toDate", void 0);
//# sourceMappingURL=eway-bill.dto.js.map