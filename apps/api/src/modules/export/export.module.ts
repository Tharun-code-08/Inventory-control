import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PdfModule } from '../../common/pdf/pdf.module';
import { ExportController } from './export.controller';
import { ExportProcessor } from './export.processor';

@Module({
  imports: [PdfModule, BullModule.registerQueue({ name: 'exports' })],
  controllers: [ExportController],
  providers: [ExportProcessor],
})
export class ExportModule {}
