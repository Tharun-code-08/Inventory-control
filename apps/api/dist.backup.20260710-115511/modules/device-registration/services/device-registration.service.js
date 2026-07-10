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
var DeviceRegistrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceRegistrationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let DeviceRegistrationService = DeviceRegistrationService_1 = class DeviceRegistrationService {
    prisma;
    logger = new common_1.Logger(DeviceRegistrationService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async registerDevice(userId, companyId, dto) {
        const existing = await this.prisma.deviceRegistration.findFirst({
            where: {
                userId,
                deviceId: dto.deviceId,
            },
        });
        if (existing) {
            return this.prisma.deviceRegistration.update({
                where: { id: existing.id },
                data: {
                    pushToken: dto.pushToken,
                    deviceName: dto.deviceName,
                    appVersion: dto.appVersion,
                    osVersion: dto.osVersion,
                    isActive: true,
                    lastActiveAt: new Date(),
                },
            });
        }
        return this.prisma.deviceRegistration.create({
            data: {
                userId,
                companyId,
                deviceId: dto.deviceId,
                deviceName: dto.deviceName,
                platform: dto.platform,
                pushToken: dto.pushToken,
                appVersion: dto.appVersion,
                osVersion: dto.osVersion,
                isActive: true,
                lastActiveAt: new Date(),
            },
        });
    }
    async unregisterDevice(userId, dto) {
        const device = await this.prisma.deviceRegistration.findFirst({
            where: {
                userId,
                deviceId: dto.deviceId,
            },
        });
        if (!device) {
            throw new common_1.NotFoundException('Device not found');
        }
        await this.prisma.deviceRegistration.delete({
            where: { id: device.id },
        });
    }
    async getUserDevices(userId) {
        return this.prisma.deviceRegistration.findMany({
            where: { userId },
            orderBy: { lastActiveAt: 'desc' },
        });
    }
    async getUserActiveDevices(userId) {
        return this.prisma.deviceRegistration.findMany({
            where: {
                userId,
                isActive: true,
            },
            orderBy: { lastActiveAt: 'desc' },
        });
    }
    async updatePushToken(userId, dto) {
        const device = await this.prisma.deviceRegistration.findFirst({
            where: {
                userId,
                deviceId: dto.deviceId,
            },
        });
        if (!device) {
            throw new common_1.NotFoundException('Device not found');
        }
        return this.prisma.deviceRegistration.update({
            where: { id: device.id },
            data: {
                pushToken: dto.pushToken,
                lastActiveAt: new Date(),
            },
        });
    }
    async markDeviceActive(userId, deviceId) {
        const device = await this.prisma.deviceRegistration.findFirst({
            where: {
                userId,
                deviceId,
            },
        });
        if (!device) {
            throw new common_1.NotFoundException('Device not found');
        }
        return this.prisma.deviceRegistration.update({
            where: { id: device.id },
            data: {
                isActive: true,
                lastActiveAt: new Date(),
            },
        });
    }
    async deactivateDevice(userId, deviceId) {
        const device = await this.prisma.deviceRegistration.findFirst({
            where: {
                userId,
                deviceId,
            },
        });
        if (!device) {
            throw new common_1.NotFoundException('Device not found');
        }
        return this.prisma.deviceRegistration.update({
            where: { id: device.id },
            data: {
                isActive: false,
            },
        });
    }
    async getCompanyPushTokens(companyId) {
        const devices = await this.prisma.deviceRegistration.findMany({
            where: {
                companyId,
                isActive: true,
                pushToken: { not: null },
            },
        });
        const tokensByPlatform = new Map();
        for (const device of devices) {
            if (device.pushToken) {
                const platform = device.platform;
                if (!tokensByPlatform.has(platform)) {
                    tokensByPlatform.set(platform, []);
                }
                tokensByPlatform.get(platform).push(device.pushToken);
            }
        }
        return tokensByPlatform;
    }
    async cleanupInactiveDevices(inactiveDaysThreshold = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - inactiveDaysThreshold);
        const result = await this.prisma.deviceRegistration.deleteMany({
            where: {
                isActive: false,
                lastActiveAt: { lt: cutoffDate },
            },
        });
        this.logger.log(`Deleted ${result.count} inactive devices`);
        return { deleted: result.count };
    }
    async getDevice(deviceId) {
        return this.prisma.deviceRegistration.findFirst({
            where: { deviceId },
        });
    }
};
exports.DeviceRegistrationService = DeviceRegistrationService;
exports.DeviceRegistrationService = DeviceRegistrationService = DeviceRegistrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DeviceRegistrationService);
//# sourceMappingURL=device-registration.service.js.map