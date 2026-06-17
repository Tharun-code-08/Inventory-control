import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DevicePlatform } from '@prisma/client';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Unique device ID',
    example: 'DEVICE-12345-ABCDE',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    description: 'Device name or model',
    example: 'Samsung Galaxy S24',
  })
  @IsString()
  @IsOptional()
  deviceName?: string;

  @ApiProperty({
    enum: DevicePlatform,
    description: 'Device platform',
    example: 'ANDROID',
  })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @ApiProperty({
    description: 'Firebase/APNS push notification token',
    example: 'exponentPushToken[abcd...xyz]',
  })
  @IsString()
  pushToken: string;

  @ApiProperty({
    description: 'Application version',
    example: '1.0.0',
    required: false,
  })
  @IsString()
  @IsOptional()
  appVersion?: string;

  @ApiProperty({
    description: 'Operating system version',
    example: '15.0',
    required: false,
  })
  @IsString()
  @IsOptional()
  osVersion?: string;
}

export class DeviceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  deviceId: string;

  @ApiProperty({ required: false, nullable: true })
  deviceName?: string | null;

  @ApiProperty({ enum: DevicePlatform })
  platform: DevicePlatform;

  @ApiProperty({ required: false, nullable: true })
  pushToken?: string | null;

  @ApiProperty({ required: false, nullable: true })
  appVersion?: string | null;

  @ApiProperty({ required: false, nullable: true })
  osVersion?: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  lastActiveAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DeviceListResponseDto {
  @ApiProperty({ type: [DeviceResponseDto] })
  devices: DeviceResponseDto[];

  @ApiProperty()
  total: number;
}

export class UnregisterDeviceDto {
  @ApiProperty({
    description: 'Device ID to unregister',
    example: 'DEVICE-12345-ABCDE',
  })
  @IsString()
  deviceId: string;
}

export class UpdatePushTokenDto {
  @ApiProperty({
    description: 'Device ID to update',
    example: 'DEVICE-12345-ABCDE',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    description: 'New push notification token',
    example: 'exponentPushToken[new...]',
  })
  @IsString()
  pushToken: string;
}
