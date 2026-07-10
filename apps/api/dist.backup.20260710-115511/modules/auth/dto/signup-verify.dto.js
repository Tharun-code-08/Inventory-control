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
exports.SignupVerifyDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class SignupVerifyDto {
    email;
    otp;
    phoneOtp;
    paymentOrderId;
}
exports.SignupVerifyDto = SignupVerifyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'priya@acmeretail.com' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value)),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], SignupVerifyDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '482916' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6),
    (0, class_validator_1.Matches)(/^\d{6}$/, { message: 'Enter the 6-digit code from your email' }),
    __metadata("design:type", String)
], SignupVerifyDto.prototype, "otp", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '193842', description: 'WhatsApp OTP — required when one was sent to the mobile number' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 6),
    (0, class_validator_1.Matches)(/^\d{6}$/, { message: 'Enter the 6-digit code from WhatsApp' }),
    __metadata("design:type", String)
], SignupVerifyDto.prototype, "phoneOtp", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Verified Razorpay order id when signing up after payment' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SignupVerifyDto.prototype, "paymentOrderId", void 0);
//# sourceMappingURL=signup-verify.dto.js.map