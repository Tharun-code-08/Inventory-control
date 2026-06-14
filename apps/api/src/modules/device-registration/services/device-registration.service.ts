import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RegisterDeviceDto, UnregisterDeviceDto, UpdatePushTokenDto } from '../dto';
import { DeviceRegistration } from '@prisma/client';

@Injectable()
export class DeviceRegistrationService {
  private readonly logger = new Logger(DeviceRegistrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register or update a device for push notifications
   */
  async registerDevice(
    userId: string,
    companyId: string,
    dto: RegisterDeviceDto,
  ): Promise<DeviceRegistration> {
    // Check if device already registered for this user
    const existing = await this.prisma.deviceRegistration.findFirst({
      where: {
        userId,
        deviceId: dto.deviceId,
      },
    });

    if (existing) {
      // Update existing device registration
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

    // Create new device registration
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

  /**
   * Unregister a device
   */
  async unregisterDevice(
    userId: string,
    dto: UnregisterDeviceDto,
  ): Promise<void> {
    const device = await this.prisma.deviceRegistration.findFirst({
      where: {
        userId,
        deviceId: dto.deviceId,
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.deviceRegistration.delete({
      where: { id: device.id },
    });
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: string): Promise<DeviceRegistration[]> {
    return this.prisma.deviceRegistration.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  /**
   * Get active devices for a user
   */
  async getUserActiveDevices(userId: string): Promise<DeviceRegistration[]> {
    return this.prisma.deviceRegistration.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  /**
   * Update push token for a device
   */
  async updatePushToken(
    userId: string,
    dto: UpdatePushTokenDto,
  ): Promise<DeviceRegistration> {
    const device = await this.prisma.deviceRegistration.findFirst({
      where: {
        userId,
        deviceId: dto.deviceId,
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return this.prisma.deviceRegistration.update({
      where: { id: device.id },
      data: {
        pushToken: dto.pushToken,
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Mark device as active
   */
  async markDeviceActive(userId: string, deviceId: string): Promise<DeviceRegistration> {
    const device = await this.prisma.deviceRegistration.findFirst({
      where: {
        userId,
        deviceId,
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return this.prisma.deviceRegistration.update({
      where: { id: device.id },
      data: {
        isActive: true,
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Deactivate a device
   */
  async deactivateDevice(userId: string, deviceId: string): Promise<DeviceRegistration> {
    const device = await this.prisma.deviceRegistration.findFirst({
      where: {
        userId,
        deviceId,
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return this.prisma.deviceRegistration.update({
      where: { id: device.id },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Get all active push tokens for a company (for broadcasting)
   */
  async getCompanyPushTokens(companyId: string): Promise<Map<string, string[]>> {
    const devices = await this.prisma.deviceRegistration.findMany({
      where: {
        companyId,
        isActive: true,
        pushToken: { not: null },
      },
    });

    const tokensByPlatform = new Map<string, string[]>();

    for (const device of devices) {
      if (device.pushToken) {
        const platform = device.platform;
        if (!tokensByPlatform.has(platform)) {
          tokensByPlatform.set(platform, []);
        }
        tokensByPlatform.get(platform)!.push(device.pushToken);
      }
    }

    return tokensByPlatform;
  }

  /**
   * Clean up inactive devices (scheduled job)
   */
  async cleanupInactiveDevices(inactiveDaysThreshold: number = 90): Promise<{ deleted: number }> {
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

  /**
   * Get device by ID
   */
  async getDevice(deviceId: string): Promise<DeviceRegistration | null> {
    return this.prisma.deviceRegistration.findFirst({
      where: { deviceId },
    });
  }
}
