import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { StockModule } from '../stock/stock.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [BillingModule, StockModule, BullModule.registerQueue({ name: 'exports' })],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
