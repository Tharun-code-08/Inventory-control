import { Module } from '@nestjs/common';
import { BarcodesController } from './barcodes.controller';
import { BarcodesService } from './barcodes.service';
import { CompanySettingsModule } from '../company-settings/company-settings.module';

@Module({
  imports: [CompanySettingsModule],
  controllers: [BarcodesController],
  providers: [BarcodesService],
  exports: [BarcodesService],
})
export class BarcodesModule {}
