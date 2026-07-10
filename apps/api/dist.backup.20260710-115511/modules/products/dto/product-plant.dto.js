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
exports.ProductPlantDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class ProductPlantDto {
    shopId;
    storageLocationId;
    openingStock;
    batchNumber;
    expiryDate;
    minStockLevel;
    maxStockLevel;
    reorderQty;
    isActive;
}
exports.ProductPlantDto = ProductPlantDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Plant (shop) the product is being assigned to.' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ProductPlantDto.prototype, "shopId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional storage location within the plant.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ProductPlantDto.prototype, "storageLocationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Opening stock seeded as an OPENING ledger entry on create.' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ProductPlantDto.prototype, "openingStock", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Batch number for opening stock (required when openingStock > 0).' }),
    (0, class_validator_1.ValidateIf)((plant) => Number(plant.openingStock) > 0),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], ProductPlantDto.prototype, "batchNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Expiry date for opening stock (YYYY-MM-DD, required when openingStock > 0).' }),
    (0, class_validator_1.ValidateIf)((plant) => Number(plant.openingStock) > 0),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ProductPlantDto.prototype, "expiryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Per-plant minimum stock level used by reorder alerts.', default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ProductPlantDto.prototype, "minStockLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional per-plant maximum stock level.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ProductPlantDto.prototype, "maxStockLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional per-plant reorder quantity.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ProductPlantDto.prototype, "reorderQty", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProductPlantDto.prototype, "isActive", void 0);
//# sourceMappingURL=product-plant.dto.js.map