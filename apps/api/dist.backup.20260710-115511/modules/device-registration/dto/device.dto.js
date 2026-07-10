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
exports.UpdatePushTokenDto = exports.UnregisterDeviceDto = exports.DeviceListResponseDto = exports.DeviceResponseDto = exports.RegisterDeviceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class RegisterDeviceDto {
    deviceId;
    deviceName;
    platform;
    pushToken;
    appVersion;
    osVersion;
}
exports.RegisterDeviceDto = RegisterDeviceDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Unique device ID',
        example: 'DEVICE-12345-ABCDE',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Device name or model',
        example: 'Samsung Galaxy S24',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "deviceName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: client_1.DevicePlatform,
        description: 'Device platform',
        example: 'ANDROID',
    }),
    (0, class_validator_1.IsEnum)(client_1.DevicePlatform),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "platform", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Firebase/APNS push notification token',
        example: 'exponentPushToken[abcd...xyz]',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "pushToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Application version',
        example: '1.0.0',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "appVersion", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Operating system version',
        example: '15.0',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDeviceDto.prototype, "osVersion", void 0);
class DeviceResponseDto {
    id;
    userId;
    companyId;
    deviceId;
    deviceName;
    platform;
    pushToken;
    appVersion;
    osVersion;
    isActive;
    lastActiveAt;
    createdAt;
    updatedAt;
}
exports.DeviceResponseDto = DeviceResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "companyId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], DeviceResponseDto.prototype, "deviceName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.DevicePlatform }),
    __metadata("design:type", String)
], DeviceResponseDto.prototype, "platform", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], DeviceResponseDto.prototype, "pushToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], DeviceResponseDto.prototype, "appVersion", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false, nullable: true }),
    __metadata("design:type", Object)
], DeviceResponseDto.prototype, "osVersion", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], DeviceResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], DeviceResponseDto.prototype, "lastActiveAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], DeviceResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], DeviceResponseDto.prototype, "updatedAt", void 0);
class DeviceListResponseDto {
    devices;
    total;
}
exports.DeviceListResponseDto = DeviceListResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [DeviceResponseDto] }),
    __metadata("design:type", Array)
], DeviceListResponseDto.prototype, "devices", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DeviceListResponseDto.prototype, "total", void 0);
class UnregisterDeviceDto {
    deviceId;
}
exports.UnregisterDeviceDto = UnregisterDeviceDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Device ID to unregister',
        example: 'DEVICE-12345-ABCDE',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UnregisterDeviceDto.prototype, "deviceId", void 0);
class UpdatePushTokenDto {
    deviceId;
    pushToken;
}
exports.UpdatePushTokenDto = UpdatePushTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Device ID to update',
        example: 'DEVICE-12345-ABCDE',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePushTokenDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'New push notification token',
        example: 'exponentPushToken[new...]',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdatePushTokenDto.prototype, "pushToken", void 0);
//# sourceMappingURL=device.dto.js.map