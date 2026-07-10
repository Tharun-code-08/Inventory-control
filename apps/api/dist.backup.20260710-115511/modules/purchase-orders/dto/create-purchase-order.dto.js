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
exports.CreatePurchaseOrderDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class PoLine {
    productId;
    lineDescription;
    lineCategory;
    rfqItemId;
    orderQty;
    rate;
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional when lineDescription is provided (service line)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PoLine.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Custom description to print on the PO line' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PoLine.prototype, "lineDescription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional line category (e.g., Service)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PoLine.prototype, "lineCategory", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'RFQ line this PO line fulfills' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PoLine.prototype, "rfqItemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0.0001),
    __metadata("design:type", Number)
], PoLine.prototype, "orderQty", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PoLine.prototype, "rate", void 0);
class CreatePurchaseOrderDto {
    poNumber;
    poDate;
    shopId;
    contractId;
    rfqId;
    supplier;
    remarks;
    items;
    idempotencyKey;
    sendToSupplier;
    confirmOnSend;
}
exports.CreatePurchaseOrderDto = CreatePurchaseOrderDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional manual PO number (must be unique)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePurchaseOrderDto.prototype, "poNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePurchaseOrderDto.prototype, "poDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePurchaseOrderDto.prototype, "shopId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePurchaseOrderDto.prototype, "contractId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'RFQ that this PO fulfills' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePurchaseOrderDto.prototype, "rfqId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePurchaseOrderDto.prototype, "supplier", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePurchaseOrderDto.prototype, "remarks", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [PoLine] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PoLine),
    __metadata("design:type", Array)
], CreatePurchaseOrderDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePurchaseOrderDto.prototype, "idempotencyKey", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'If true, email the PO to the supplier after creation' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Boolean),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePurchaseOrderDto.prototype, "sendToSupplier", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'If true, create as CONFIRMED when sending to supplier' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Boolean),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePurchaseOrderDto.prototype, "confirmOnSend", void 0);
//# sourceMappingURL=create-purchase-order.dto.js.map