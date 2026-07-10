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
exports.SignupRequestDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class SignupRequestDto {
    companyName;
    companyAddress;
    plantName;
    plantAddress;
    contactPerson;
    mobile;
    adminName;
    email;
    password;
    confirmPassword;
    plan;
    billing;
}
exports.SignupRequestDto = SignupRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Acme Retail Pvt Ltd' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], SignupRequestDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '12 Industrial Estate, Mumbai' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(240),
    __metadata("design:type", String)
], SignupRequestDto.prototype, "companyAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Head Office' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], SignupRequestDto.prototype, "plantName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '12 Industrial Estate, Mumbai' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(240),
    __metadata("design:type", String)
], SignupRequestDto.prototype, "plantAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Priya Sharma' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], SignupRequestDto.prototype, "contactPerson", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+919876543210' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(20),
    (0, class_validator_1.Matches)(/^[+0-9][0-9\s-]{7,18}$/, {
        message: 'Enter a valid mobile number with country code',
    }),
    __metadata("design:type", String)
], SignupRequestDto.prototype, "mobile", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Priya Sharma' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], SignupRequestDto.prototype, "adminName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'priya@acmeretail.com' }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value)),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], SignupRequestDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SecurePass123!' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(72),
    (0, class_validator_1.Matches)(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
        message: 'Password must include upper, lower, and a number',
    }),
    __metadata("design:type", String)
], SignupRequestDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SecurePass123!' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], SignupRequestDto.prototype, "confirmPassword", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['trial', 'pro', 'plus'], default: 'trial' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['trial', 'pro', 'plus']),
    __metadata("design:type", String)
], SignupRequestDto.prototype, "plan", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['monthly', 'yearly'], default: 'monthly' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['monthly', 'yearly']),
    __metadata("design:type", String)
], SignupRequestDto.prototype, "billing", void 0);
//# sourceMappingURL=signup-request.dto.js.map