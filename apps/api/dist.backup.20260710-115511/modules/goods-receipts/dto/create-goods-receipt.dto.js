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
exports.CreateGoodsReceiptDto = exports.GoodsReceiptLineDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class GoodsReceiptLineDto {
    productId;
    quantity;
    uom;
    purchaseRate;
    batchNumber;
    serialNumber;
    expiryDate;
    storageLocationId;
}
exports.GoodsReceiptLineDto = GoodsReceiptLineDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GoodsReceiptLineDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0.0001),
    __metadata("design:type", Number)
], GoodsReceiptLineDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GoodsReceiptLineDto.prototype, "uom", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], GoodsReceiptLineDto.prototype, "purchaseRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GoodsReceiptLineDto.prototype, "batchNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GoodsReceiptLineDto.prototype, "serialNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], GoodsReceiptLineDto.prototype, "expiryDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GoodsReceiptLineDto.prototype, "storageLocationId", void 0);
class CreateGoodsReceiptDto {
    grDate;
    shopId;
    purchaseOrderId;
    receiptType;
    receiptSource;
    inwardShift;
    supplierName;
    supplierRef;
    remarks;
    items;
    idempotencyKey;
}
exports.CreateGoodsReceiptDto = CreateGoodsReceiptDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateGoodsReceiptDto.prototype, "grDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateGoodsReceiptDto.prototype, "shopId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateGoodsReceiptDto.prototype, "purchaseOrderId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['FULL', 'PARTIAL'], default: 'FULL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['FULL', 'PARTIAL']),
    __metadata("design:type", String)
], CreateGoodsReceiptDto.prototype, "receiptType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: ['PURCHASE_ORDER', 'OUTSIDE'],
        description: 'Inferred from purchaseOrderId when omitted (PO present → PURCHASE_ORDER, else OUTSIDE)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['PURCHASE_ORDER', 'OUTSIDE']),
    __metadata("design:type", String)
], CreateGoodsReceiptDto.prototype, "receiptSource", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['DAY_SHIFT', 'NIGHT_SHIFT'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['DAY_SHIFT', 'NIGHT_SHIFT']),
    __metadata("design:type", String)
], CreateGoodsReceiptDto.prototype, "inwardShift", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGoodsReceiptDto.prototype, "supplierName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGoodsReceiptDto.prototype, "supplierRef", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGoodsReceiptDto.prototype, "remarks", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [GoodsReceiptLineDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => GoodsReceiptLineDto),
    __metadata("design:type", Array)
], CreateGoodsReceiptDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Client-supplied idempotency key (same contract as PO/SO create)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGoodsReceiptDto.prototype, "idempotencyKey", void 0);
//# sourceMappingURL=create-goods-receipt.dto.js.map