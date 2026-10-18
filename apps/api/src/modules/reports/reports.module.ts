import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { StockModule } from '../stock/stock.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [BillingModule, StockModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
