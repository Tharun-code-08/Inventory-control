import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportProcessor } from './export.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'exports' })],
  controllers: [ExportController],
  providers: [ExportProcessor],
})
export class ExportModule {}
