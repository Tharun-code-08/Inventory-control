import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [StockModule, BillingModule],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}

