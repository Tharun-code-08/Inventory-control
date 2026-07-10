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
exports.ProductSpecificationDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const normalize_1 = require("../../../common/utils/normalize");
class ProductSpecificationDto {
    label;
    value;
}
exports.ProductSpecificationDto = ProductSpecificationDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (0, normalize_1.normalizeSpaces)(value) : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ProductSpecificationDto.prototype, "label", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (0, normalize_1.normalizeSpaces)(value) : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], ProductSpecificationDto.prototype, "value", void 0);
//# sourceMappingURL=product-specification.dto.js.map