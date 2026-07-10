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
exports.CreateSalesOrderDto = exports.CreateSalesOrderItemDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class CreateSalesOrderItemDto {
    productId;
    quantity;
    uom;
    unitPrice;
    discountAmount;
    taxRate;
    cgstRate;
    sgstRate;
    igstRate;
}
exports.CreateSalesOrderItemDto = CreateSalesOrderItemDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateSalesOrderItemDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0.0001),
    __metadata("design:type", Number)
], CreateSalesOrderItemDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 'UNIT' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSalesOrderItemDto.prototype, "uom", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateSalesOrderItemDto.prototype, "unitPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Per-line discount amount (in line currency)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateSalesOrderItemDto.prototype, "discountAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tax rate as a decimal (e.g. 0.18 for 18%)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateSalesOrderItemDto.prototype, "taxRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'CGST rate as percent (e.g. 9 for 9%)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateSalesOrderItemDto.prototype, "cgstRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SGST rate as percent (e.g. 9 for 9%)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateSalesOrderItemDto.prototype, "sgstRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'IGST rate as percent (e.g. 18 for 18%)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateSalesOrderItemDto.prototype, "igstRate", void 0);
class CreateSalesOrderDto {
    shopId;
    orderDate;
    expectedDate;
    customerId;
    remarks;
    currency;
    fxRateUsed;
    gstSupplyType;
    items;
    idempotencyKey;
}
exports.CreateSalesOrderDto = CreateSalesOrderDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateSalesOrderDto.prototype, "shopId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSalesOrderDto.prototype, "orderDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSalesOrderDto.prototype, "expectedDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateSalesOrderDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSalesOrderDto.prototype, "remarks", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 'USD' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSalesOrderDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Snapshot FX rate vs the shop functional currency at create time',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateSalesOrderDto.prototype, "fxRateUsed", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.GstSupplyType, description: 'Auto-derived from GSTIN when omitted' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.GstSupplyType),
    __metadata("design:type", String)
], CreateSalesOrderDto.prototype, "gstSupplyType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CreateSalesOrderItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateSalesOrderItemDto),
    __metadata("design:type", Array)
], CreateSalesOrderDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Client-supplied idempotency key (same contract as PO create)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSalesOrderDto.prototype, "idempotencyKey", void 0);
//# sourceMappingURL=create-sales-order.dto.js.map