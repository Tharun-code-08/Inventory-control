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
exports.VerifyPaymentDto = exports.CreateOrderDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateOrderDto {
    plan;
    billing;
}
exports.CreateOrderDto = CreateOrderDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['pro', 'plus'] }),
    (0, class_validator_1.IsIn)(['pro', 'plus']),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "plan", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['monthly', 'yearly'] }),
    (0, class_validator_1.IsIn)(['monthly', 'yearly']),
    __metadata("design:type", String)
], CreateOrderDto.prototype, "billing", void 0);
class VerifyPaymentDto {
    razorpay_order_id;
    razorpay_payment_id;
    razorpay_signature;
}
exports.VerifyPaymentDto = VerifyPaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyPaymentDto.prototype, "razorpay_order_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyPaymentDto.prototype, "razorpay_payment_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyPaymentDto.prototype, "razorpay_signature", void 0);
//# sourceMappingURL=billing.dto.js.map