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
exports.ListStockTransfersDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class ListStockTransfersDto {
    from_shop_id;
    to_shop_id;
    date_from;
    date_to;
    status;
    cursor;
    take;
}
exports.ListStockTransfersDto = ListStockTransfersDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by source shop (respects user scope)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ListStockTransfersDto.prototype, "from_shop_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by destination shop (respects user scope)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ListStockTransfersDto.prototype, "to_shop_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-05-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ListStockTransfersDto.prototype, "date_from", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-05-31' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ListStockTransfersDto.prototype, "date_to", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.DocumentStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.DocumentStatus),
    __metadata("design:type", String)
], ListStockTransfersDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListStockTransfersDto.prototype, "cursor", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ListStockTransfersDto.prototype, "take", void 0);
//# sourceMappingURL=list-stock-transfers.dto.js.map