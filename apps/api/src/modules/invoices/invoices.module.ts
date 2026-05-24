import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [StockModule, BillingModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}

