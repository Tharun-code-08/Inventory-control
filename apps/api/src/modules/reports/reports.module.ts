import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'exports' })],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
