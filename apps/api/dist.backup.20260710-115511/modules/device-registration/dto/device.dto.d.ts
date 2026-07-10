import { DevicePlatform } from '@prisma/client';
export declare class RegisterDeviceDto {
    deviceId: string;
    deviceName?: string;
    platform: DevicePlatform;
    pushToken: string;
    appVersion?: string;
    osVersion?: string;
}
export declare class DeviceResponseDto {
    id: string;
    userId: string;
    companyId: string;
    deviceId: string;
    deviceName?: string | null;
    platform: DevicePlatform;
    pushToken?: string | null;
    appVersion?: string | null;
    osVersion?: string | null;
    isActive: boolean;
    lastActiveAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare class DeviceListResponseDto {
    devices: DeviceResponseDto[];
    total: number;
}
export declare class UnregisterDeviceDto {
    deviceId: string;
}
export declare class UpdatePushTokenDto {
    deviceId: string;
    pushToken: string;
}
