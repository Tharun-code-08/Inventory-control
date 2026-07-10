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
exports.BulkInventoryDto = exports.BulkInventoryRowDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class BulkInventoryRowDto {
    productCode;
    shopNumber;
    storageLocationCode;
    minStock;
    maxStock;
    reorderQty;
}
exports.BulkInventoryRowDto = BulkInventoryRowDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SKU-001' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], BulkInventoryRowDto.prototype, "productCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'BMW-001' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], BulkInventoryRowDto.prototype, "shopNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'SL-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? (value.trim() === '' ? undefined : value.trim()) : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], BulkInventoryRowDto.prototype, "storageLocationCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], BulkInventoryRowDto.prototype, "minStock", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], BulkInventoryRowDto.prototype, "maxStock", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], BulkInventoryRowDto.prototype, "reorderQty", void 0);
class BulkInventoryDto {
    rows;
}
exports.BulkInventoryDto = BulkInventoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: () => [BulkInventoryRowDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(5000),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BulkInventoryRowDto),
    __metadata("design:type", Array)
], BulkInventoryDto.prototype, "rows", void 0);
//# sourceMappingURL=bulk-inventory.dto.js.map