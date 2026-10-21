import { Module } from '@nestjs/common';
import { DeviceRegistrationService } from './services/device-registration.service';
import { DeviceRegistrationController } from './device-registration.controller';

@Module({
  providers: [DeviceRegistrationService],
  controllers: [DeviceRegistrationController],
  exports: [DeviceRegistrationService],
})
export class DeviceRegistrationModule {}
