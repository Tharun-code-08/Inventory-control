import { PrismaService } from "../../../prisma/prisma.service";
import { RegisterDeviceDto, UnregisterDeviceDto, UpdatePushTokenDto } from '../dto';
import { DeviceRegistration } from '@prisma/client';
export declare class DeviceRegistrationService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    registerDevice(userId: string, companyId: string, dto: RegisterDeviceDto): Promise<DeviceRegistration>;
    unregisterDevice(userId: string, dto: UnregisterDeviceDto): Promise<void>;
    getUserDevices(userId: string): Promise<DeviceRegistration[]>;
    getUserActiveDevices(userId: string): Promise<DeviceRegistration[]>;
    updatePushToken(userId: string, dto: UpdatePushTokenDto): Promise<DeviceRegistration>;
    markDeviceActive(userId: string, deviceId: string): Promise<DeviceRegistration>;
    deactivateDevice(userId: string, deviceId: string): Promise<DeviceRegistration>;
    getCompanyPushTokens(companyId: string): Promise<Map<string, string[]>>;
    cleanupInactiveDevices(inactiveDaysThreshold?: number): Promise<{
        deleted: number;
    }>;
    getDevice(deviceId: string): Promise<DeviceRegistration | null>;
}
