import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { DeviceRegistrationService } from './services/device-registration.service';
import { DeviceRegistrationController } from './device-registration.controller';

@Module({
  providers: [PrismaService, DeviceRegistrationService],
  controllers: [DeviceRegistrationController],
  exports: [DeviceRegistrationService],
})
export class DeviceRegistrationModule {}
