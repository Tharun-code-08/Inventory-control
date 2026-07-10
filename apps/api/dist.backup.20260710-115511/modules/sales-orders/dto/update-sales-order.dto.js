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
exports.UpdateSalesOrderDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const create_sales_order_dto_1 = require("./create-sales-order.dto");
class UpdateSalesOrderDto {
    orderDate;
    expectedDate;
    customerId;
    remarks;
    gstSupplyType;
    items;
}
exports.UpdateSalesOrderDto = UpdateSalesOrderDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateSalesOrderDto.prototype, "orderDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateSalesOrderDto.prototype, "expectedDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateSalesOrderDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSalesOrderDto.prototype, "remarks", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.GstSupplyType, description: 'Auto-derived from GSTIN when omitted' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.GstSupplyType),
    __metadata("design:type", String)
], UpdateSalesOrderDto.prototype, "gstSupplyType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [create_sales_order_dto_1.CreateSalesOrderItemDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => create_sales_order_dto_1.CreateSalesOrderItemDto),
    __metadata("design:type", Array)
], UpdateSalesOrderDto.prototype, "items", void 0);
//# sourceMappingURL=update-sales-order.dto.js.map