import { DeviceRegistrationService } from './services';
import { RegisterDeviceDto, DeviceResponseDto, DeviceListResponseDto, UnregisterDeviceDto, UpdatePushTokenDto } from './dto';
export declare class DeviceRegistrationController {
    private readonly deviceService;
    private readonly logger;
    constructor(deviceService: DeviceRegistrationService);
    registerDevice(dto: RegisterDeviceDto, user: any): Promise<DeviceResponseDto>;
    getUserDevices(user: any): Promise<DeviceListResponseDto>;
    getActiveDevices(user: any): Promise<DeviceListResponseDto>;
    getDevice(deviceId: string, user: any): Promise<DeviceResponseDto>;
    updatePushToken(deviceId: string, dto: UpdatePushTokenDto, user: any): Promise<DeviceResponseDto>;
    markDeviceActive(deviceId: string, user: any): Promise<DeviceResponseDto>;
    deactivateDevice(deviceId: string, user: any): Promise<DeviceResponseDto>;
    unregisterDevice(deviceId: string, dto: UnregisterDeviceDto, user: any): Promise<void>;
}
