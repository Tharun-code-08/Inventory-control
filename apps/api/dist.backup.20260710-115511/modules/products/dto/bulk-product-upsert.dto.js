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
exports.BulkProductUpsertDto = exports.BulkProductUpsertRowDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const normalize_1 = require("../../../common/utils/normalize");
class BulkProductUpsertRowDto {
    productCode;
    shopNumber;
    storageLocationCode;
    description;
    category;
    uom;
    hsnCode;
    materialGroup;
    drawingReference;
    brand;
    taxPreference;
    purchasePrice;
    sellingPrice;
    openingStock;
    batchNumber;
    expiryDate;
    minStockLevel;
    maxStockLevel;
    reorderQty;
    isActive;
}
exports.BulkProductUpsertRowDto = BulkProductUpsertRowDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'SKU-001', description: 'Existing SKU to update. Leave blank to create a new product.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (typeof value !== 'string')
            return value;
        const trimmed = value.trim().toUpperCase();
        return trimmed === '' ? undefined : trimmed;
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[A-Z0-9_-]{1,40}$/),
    __metadata("design:type", String)
], BulkProductUpsertRowDto.prototype, "productCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'SDC-001', description: 'Plant/shop number or name. Shop users may leave this blank.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (typeof value !== 'string')
            return value;
        const trimmed = value.trim();
        return trimmed === '' ? undefined : trimmed;
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], BulkProductUpsertRowDto.prototype, "shopNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'SL-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? (value.trim() === '' ? undefined : value.trim()) : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], BulkProductUpsertRowDto.prototype, "storageLocationCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Product name / description' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (0, normalize_1.normalizeSpaces)(value) : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], BulkProductUpsertRowDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (0, normalize_1.normalizeSpaces)(value) : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], BulkProductUpsertRowDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'pcs' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (0, normalize_1.normalizeSpaces)(value) : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], BulkProductUpsertRowDto.prototype, "uom", void 0);
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
], BulkProductUpsertRowDto.prototype, "hsnCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
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
], BulkProductUpsertRowDto.prototype, "materialGroup", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
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
], BulkProductUpsertRowDto.prototype, "drawingReference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
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
], BulkProductUpsertRowDto.prototype, "brand", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.TaxPreference, default: client_1.TaxPreference.TAXABLE }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TaxPreference),
    __metadata("design:type", String)
], BulkProductUpsertRowDto.prototype, "taxPreference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], BulkProductUpsertRowDto.prototype, "purchasePrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], BulkProductUpsertRowDto.prototype, "sellingPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Target stock after import for the selected plant.' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], BulkProductUpsertRowDto.prototype, "openingStock", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Batch number (required when openingStock > 0).' }),
    (0, class_validator_1.ValidateIf)((row) => Number(row.openingStock) > 0),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], BulkProductUpsertRowDto.prototype, "batchNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Expiry date YYYY-MM-DD (required when openingStock > 0).' }),
    (0, class_validator_1.ValidateIf)((row) => Number(row.openingStock) > 0),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], BulkProductUpsertRowDto.prototype, "expiryDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], BulkProductUpsertRowDto.prototype, "minStockLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], BulkProductUpsertRowDto.prototype, "maxStockLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], BulkProductUpsertRowDto.prototype, "reorderQty", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], BulkProductUpsertRowDto.prototype, "isActive", void 0);
class BulkProductUpsertDto {
    validateOnly;
    rows;
}
exports.BulkProductUpsertDto = BulkProductUpsertDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: false, description: 'Validate the rows without committing changes.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], BulkProductUpsertDto.prototype, "validateOnly", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: () => [BulkProductUpsertRowDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(2000),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BulkProductUpsertRowDto),
    __metadata("design:type", Array)
], BulkProductUpsertDto.prototype, "rows", void 0);
//# sourceMappingURL=bulk-product-upsert.dto.js.map