import { Module } from '@nestjs/common';
import { BarcodesController } from './barcodes.controller';
import { BarcodesService } from './barcodes.service';

@Module({
  controllers: [BarcodesController],
  providers: [BarcodesService],
  exports: [BarcodesService],
})
export class BarcodesModule {}
