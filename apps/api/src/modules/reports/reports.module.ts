import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [BillingModule, BullModule.registerQueue({ name: 'exports' })],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
