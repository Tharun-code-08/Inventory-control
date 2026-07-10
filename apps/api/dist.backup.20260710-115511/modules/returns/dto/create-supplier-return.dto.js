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
exports.CreateSupplierReturnDto = exports.CreateSupplierReturnItemDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class CreateSupplierReturnItemDto {
    goodsReceiptItemId;
    returnQty;
    reasonCode;
}
exports.CreateSupplierReturnItemDto = CreateSupplierReturnItemDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateSupplierReturnItemDto.prototype, "goodsReceiptItemId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Quantity to return from the selected goods receipt line' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0.0001),
    __metadata("design:type", Number)
], CreateSupplierReturnItemDto.prototype, "returnQty", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.SupplierReturnReasonCode }),
    (0, class_validator_1.IsEnum)(client_1.SupplierReturnReasonCode),
    __metadata("design:type", String)
], CreateSupplierReturnItemDto.prototype, "reasonCode", void 0);
class CreateSupplierReturnDto {
    shopId;
    returnDate;
    goodsReceiptId;
    supplierRef;
    remarks;
    internalCcEmail;
    items;
}
exports.CreateSupplierReturnDto = CreateSupplierReturnDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateSupplierReturnDto.prototype, "shopId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSupplierReturnDto.prototype, "returnDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateSupplierReturnDto.prototype, "goodsReceiptId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSupplierReturnDto.prototype, "supplierRef", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSupplierReturnDto.prototype, "remarks", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateSupplierReturnDto.prototype, "internalCcEmail", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CreateSupplierReturnItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateSupplierReturnItemDto),
    __metadata("design:type", Array)
], CreateSupplierReturnDto.prototype, "items", void 0);
//# sourceMappingURL=create-supplier-return.dto.js.map