import { Module } from '@nestjs/common';
import { SalesQuotationsController } from './sales-quotations.controller';
import { SalesQuotationsService } from './sales-quotations.service';
import { StockModule } from '../stock/stock.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [StockModule, BillingModule],
  controllers: [SalesQuotationsController],
  providers: [SalesQuotationsService],
  exports: [SalesQuotationsService],
})
export class SalesQuotationsModule {}
