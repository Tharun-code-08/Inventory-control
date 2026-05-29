import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';
import { BillingModule } from '../billing/billing.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { DocumentEmailModule } from '../document-email/document-email.module';

@Module({
  imports: [StockModule, BillingModule, EmailNotificationsModule, DocumentEmailModule],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}

