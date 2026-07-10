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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DeviceRegistrationController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceRegistrationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const services_1 = require("./services");
const dto_1 = require("./dto");
let DeviceRegistrationController = DeviceRegistrationController_1 = class DeviceRegistrationController {
    deviceService;
    logger = new common_1.Logger(DeviceRegistrationController_1.name);
    constructor(deviceService) {
        this.deviceService = deviceService;
    }
    async registerDevice(dto, user) {
        this.logger.debug(`Registering device ${dto.deviceId} for user ${user.id}`);
        return this.deviceService.registerDevice(user.id, user.companyId, dto);
    }
    async getUserDevices(user) {
        const devices = await this.deviceService.getUserDevices(user.id);
        return {
            devices: devices,
            total: devices.length,
        };
    }
    async getActiveDevices(user) {
        const devices = await this.deviceService.getUserActiveDevices(user.id);
        return {
            devices: devices,
            total: devices.length,
        };
    }
    async getDevice(deviceId, user) {
        const device = await this.deviceService.getDevice(deviceId);
        if (!device || device.userId !== user.id) {
            throw new Error('Device not found or unauthorized');
        }
        return device;
    }
    async updatePushToken(deviceId, dto, user) {
        return this.deviceService.updatePushToken(user.id, {
            deviceId,
            pushToken: dto.pushToken,
        });
    }
    async markDeviceActive(deviceId, user) {
        return this.deviceService.markDeviceActive(user.id, deviceId);
    }
    async deactivateDevice(deviceId, user) {
        return this.deviceService.deactivateDevice(user.id, deviceId);
    }
    async unregisterDevice(deviceId, dto, user) {
        await this.deviceService.unregisterDevice(user.id, {
            deviceId,
        });
    }
};
exports.DeviceRegistrationController = DeviceRegistrationController;
__decorate([
    (0, common_1.Post)('/register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Register a device for push notifications' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: dto_1.DeviceResponseDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.RegisterDeviceDto, Object]),
    __metadata("design:returntype", Promise)
], DeviceRegistrationController.prototype, "registerDevice", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all devices for current user' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.DeviceListResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeviceRegistrationController.prototype, "getUserDevices", null);
__decorate([
    (0, common_1.Get)('/active'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all active devices for current user' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.DeviceListResponseDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeviceRegistrationController.prototype, "getActiveDevices", null);
__decorate([
    (0, common_1.Get)(':deviceId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get device by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.DeviceResponseDto }),
    __param(0, (0, common_1.Param)('deviceId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DeviceRegistrationController.prototype, "getDevice", null);
__decorate([
    (0, common_1.Patch)(':deviceId/push-token'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update push token for a device' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.DeviceResponseDto }),
    __param(0, (0, common_1.Param)('deviceId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdatePushTokenDto, Object]),
    __metadata("design:returntype", Promise)
], DeviceRegistrationController.prototype, "updatePushToken", null);
__decorate([
    (0, common_1.Patch)(':deviceId/active'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Mark device as active' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.DeviceResponseDto }),
    __param(0, (0, common_1.Param)('deviceId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DeviceRegistrationController.prototype, "markDeviceActive", null);
__decorate([
    (0, common_1.Patch)(':deviceId/inactive'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Deactivate a device' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: dto_1.DeviceResponseDto }),
    __param(0, (0, common_1.Param)('deviceId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DeviceRegistrationController.prototype, "deactivateDevice", null);
__decorate([
    (0, common_1.Delete)(':deviceId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Unregister a device' }),
    (0, swagger_1.ApiResponse)({ status: 204 }),
    __param(0, (0, common_1.Param)('deviceId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UnregisterDeviceDto, Object]),
    __metadata("design:returntype", Promise)
], DeviceRegistrationController.prototype, "unregisterDevice", null);
exports.DeviceRegistrationController = DeviceRegistrationController = DeviceRegistrationController_1 = __decorate([
    (0, swagger_1.ApiTags)('Device Registration'),
    (0, common_1.Controller)('devices'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [services_1.DeviceRegistrationService])
], DeviceRegistrationController);
//# sourceMappingURL=device-registration.controller.js.map