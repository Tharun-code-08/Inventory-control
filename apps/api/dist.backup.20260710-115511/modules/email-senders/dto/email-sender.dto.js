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
exports.VerifySenderOtpDto = exports.ConfigureSenderSmtpDto = exports.UpdateEmailSenderDto = exports.CreateEmailSenderDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class CreateEmailSenderDto {
    displayName;
    email;
}
exports.CreateEmailSenderDto = CreateEmailSenderDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 120),
    __metadata("design:type", String)
], CreateEmailSenderDto.prototype, "displayName", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateEmailSenderDto.prototype, "email", void 0);
class UpdateEmailSenderDto {
    displayName;
    isPrimary;
}
exports.UpdateEmailSenderDto = UpdateEmailSenderDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 120),
    __metadata("design:type", String)
], UpdateEmailSenderDto.prototype, "displayName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateEmailSenderDto.prototype, "isPrimary", void 0);
class ConfigureSenderSmtpDto {
    host;
    port;
    secure;
    user;
    password;
}
exports.ConfigureSenderSmtpDto = ConfigureSenderSmtpDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 255),
    __metadata("design:type", String)
], ConfigureSenderSmtpDto.prototype, "host", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(65535),
    __metadata("design:type", Number)
], ConfigureSenderSmtpDto.prototype, "port", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ConfigureSenderSmtpDto.prototype, "secure", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 255),
    __metadata("design:type", String)
], ConfigureSenderSmtpDto.prototype, "user", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 512),
    __metadata("design:type", String)
], ConfigureSenderSmtpDto.prototype, "password", void 0);
class VerifySenderOtpDto {
    otpCode;
}
exports.VerifySenderOtpDto = VerifySenderOtpDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{6}$/),
    __metadata("design:type", String)
], VerifySenderOtpDto.prototype, "otpCode", void 0);
//# sourceMappingURL=email-sender.dto.js.map