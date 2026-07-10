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
exports.CreateProductDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const normalize_1 = require("../../../common/utils/normalize");
const product_plant_dto_1 = require("./product-plant.dto");
const product_specification_dto_1 = require("./product-specification.dto");
class CreateProductDto {
    productCode;
    description;
    uom;
    category;
    hsnCode;
    materialGroup;
    drawingReference;
    brand;
    taxPreference;
    gstRate;
    purchasePrice;
    sellingPrice;
    isActive;
    plants;
    specifications;
}
exports.CreateProductDto = CreateProductDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SKU-001' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[A-Z0-9_-]{1,40}$/),
    __metadata("design:type", String)
], CreateProductDto.prototype, "productCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (0, normalize_1.normalizeSpaces)(value) : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateProductDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'UNIT' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (0, normalize_1.normalizeSpaces)(value) : value)),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "uom", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (0, normalize_1.normalizeSpaces)(value) : value)),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Harmonized System of Nomenclature code (4, 6, or 8 digits)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (typeof value !== 'string')
            return value;
        const trimmed = value.trim();
        return trimmed === '' ? undefined : trimmed;
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{4}(\d{2}){0,2}$/, { message: 'HSN code must be 4, 6, or 8 digits' }),
    __metadata("design:type", String)
], CreateProductDto.prototype, "hsnCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (0, normalize_1.normalizeSpaces)(value) : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], CreateProductDto.prototype, "materialGroup", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (0, normalize_1.normalizeSpaces)(value) : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], CreateProductDto.prototype, "drawingReference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Bosch' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (typeof value !== 'string')
            return value;
        const trimmed = (0, normalize_1.normalizeSpaces)(value);
        return trimmed === '' ? undefined : trimmed;
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], CreateProductDto.prototype, "brand", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.TaxPreference, default: client_1.TaxPreference.TAXABLE }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TaxPreference),
    __metadata("design:type", String)
], CreateProductDto.prototype, "taxPreference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Default combined GST rate as percent (e.g. 18 for 18%)',
        example: 18,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "gstRate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "purchasePrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "sellingPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateProductDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: () => [product_plant_dto_1.ProductPlantDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => product_plant_dto_1.ProductPlantDto),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "plants", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: () => [product_specification_dto_1.ProductSpecificationDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => product_specification_dto_1.ProductSpecificationDto),
    __metadata("design:type", Array)
], CreateProductDto.prototype, "specifications", void 0);
//# sourceMappingURL=create-product.dto.js.map