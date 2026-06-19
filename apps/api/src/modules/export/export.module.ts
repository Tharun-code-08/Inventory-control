import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CommonPdfModule } from '../../common/pdf/common-pdf.module';
import { ExportController } from './export.controller';
import { ExportProcessor } from './export.processor';

@Module({
  imports: [CommonPdfModule, BullModule.registerQueue({ name: 'exports' })],
  controllers: [ExportController],
  providers: [ExportProcessor],
})
export class ExportModule {}
