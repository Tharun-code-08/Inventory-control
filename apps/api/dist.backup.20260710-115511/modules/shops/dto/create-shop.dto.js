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
exports.CreateShopDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const normalize_1 = require("../../../common/utils/normalize");
class CreateShopDto {
    shopNumber;
    shopName;
    address;
    taxId;
    contactPerson;
    mobile;
    email;
    companyId;
    isActive;
}
exports.CreateShopDto = CreateShopDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SH-003' }),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim().toUpperCase().replace(/\s+/g, '') : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[A-Z0-9_-]{3,20}$/, {
        message: 'Plant code must be 3–20 characters using letters, numbers, hyphens, or underscores only',
    }),
    __metadata("design:type", String)
], CreateShopDto.prototype, "shopNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (0, normalize_1.normalizeSpaces)(value) : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], CreateShopDto.prototype, "shopName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (0, normalize_1.normalizeSpaces)(value) : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], CreateShopDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (0, normalize_1.normalizeSpaces)(value) : value)),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShopDto.prototype, "taxId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (0, normalize_1.normalizeSpaces)(value) : value)),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShopDto.prototype, "contactPerson", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+94771234567' }),
    (0, class_validator_1.Matches)(/^\+?[0-9]{7,15}$/),
    __metadata("design:type", String)
], CreateShopDto.prototype, "mobile", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateShopDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional company id (for plant grouping)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateShopDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateShopDto.prototype, "isActive", void 0);
//# sourceMappingURL=create-shop.dto.js.map