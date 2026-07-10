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
exports.UpdateBarcodeDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
class UpdateBarcodeDto {
    barcodeType;
    isPrimary;
    supplierId;
}
exports.UpdateBarcodeDto = UpdateBarcodeDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.BarcodeType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.BarcodeType),
    __metadata("design:type", String)
], UpdateBarcodeDto.prototype, "barcodeType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateBarcodeDto.prototype, "isPrimary", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional supplier ID. Set to null to clear connection.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateBarcodeDto.prototype, "supplierId", void 0);
//# sourceMappingURL=update-barcode.dto.js.map