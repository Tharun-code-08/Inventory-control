import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { DeviceRegistrationService } from './services';
import {
  RegisterDeviceDto,
  DeviceResponseDto,
  DeviceListResponseDto,
  UnregisterDeviceDto,
  UpdatePushTokenDto,
} from './dto';

@ApiTags('Device Registration')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeviceRegistrationController {
  private readonly logger = new Logger(DeviceRegistrationController.name);

  constructor(private readonly deviceService: DeviceRegistrationService) {}

  @Post('/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a device for push notifications' })
  @ApiResponse({ status: 201, type: DeviceResponseDto })
  async registerDevice(
    @Body() dto: RegisterDeviceDto,
    @CurrentUser() user: any,
  ): Promise<DeviceResponseDto> {
    this.logger.debug(`Registering device ${dto.deviceId} for user ${user.id}`);
    return this.deviceService.registerDevice(user.id, user.companyId!, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all devices for current user' })
  @ApiResponse({ status: 200, type: DeviceListResponseDto })
  async getUserDevices(
    @CurrentUser() user: any,
  ): Promise<DeviceListResponseDto> {
    const devices = await this.deviceService.getUserDevices(user.id);
    return {
      devices: devices as DeviceResponseDto[],
      total: devices.length,
    };
  }

  @Get('/active')
  @ApiOperation({ summary: 'Get all active devices for current user' })
  @ApiResponse({ status: 200, type: DeviceListResponseDto })
  async getActiveDevices(
    @CurrentUser() user: any,
  ): Promise<DeviceListResponseDto> {
    const devices = await this.deviceService.getUserActiveDevices(user.id);
    return {
      devices: devices as DeviceResponseDto[],
      total: devices.length,
    };
  }

  @Get(':deviceId')
  @ApiOperation({ summary: 'Get device by ID' })
  @ApiResponse({ status: 200, type: DeviceResponseDto })
  async getDevice(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: any,
  ): Promise<DeviceResponseDto> {
    const device = await this.deviceService.getDevice(deviceId);
    if (!device || device.userId !== user.id) {
      throw new Error('Device not found or unauthorized');
    }
    return device as DeviceResponseDto;
  }

  @Patch(':deviceId/push-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update push token for a device' })
  @ApiResponse({ status: 200, type: DeviceResponseDto })
  async updatePushToken(
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdatePushTokenDto,
    @CurrentUser() user: any,
  ): Promise<DeviceResponseDto> {
    return this.deviceService.updatePushToken(user.id, {
      deviceId,
      pushToken: dto.pushToken,
    });
  }

  @Patch(':deviceId/active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark device as active' })
  @ApiResponse({ status: 200, type: DeviceResponseDto })
  async markDeviceActive(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: any,
  ): Promise<DeviceResponseDto> {
    return this.deviceService.markDeviceActive(user.id, deviceId);
  }

  @Patch(':deviceId/inactive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a device' })
  @ApiResponse({ status: 200, type: DeviceResponseDto })
  async deactivateDevice(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: any,
  ): Promise<DeviceResponseDto> {
    return this.deviceService.deactivateDevice(user.id, deviceId);
  }

  @Delete(':deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister a device' })
  @ApiResponse({ status: 204 })
  async unregisterDevice(
    @Param('deviceId') deviceId: string,
    @Body() dto: UnregisterDeviceDto,
    @CurrentUser() user: any,
  ): Promise<void> {
    await this.deviceService.unregisterDevice(user.id, {
      deviceId,
    });
  }
}
