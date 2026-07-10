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
exports.ListSupplierBillsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const cursor_page_dto_1 = require("../../../common/dto/cursor-page.dto");
const date_range_dto_1 = require("../../../common/dto/date-range.dto");
class ListSupplierBillsDto extends (0, swagger_1.IntersectionType)(cursor_page_dto_1.CursorPageDto, date_range_dto_1.DateRangeQueryDto) {
    shop_id;
    status;
    supplier_id;
}
exports.ListSupplierBillsDto = ListSupplierBillsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ListSupplierBillsDto.prototype, "shop_id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.SupplierBillStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.SupplierBillStatus),
    __metadata("design:type", String)
], ListSupplierBillsDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ListSupplierBillsDto.prototype, "supplier_id", void 0);
//# sourceMappingURL=list-supplier-bills.dto.js.map