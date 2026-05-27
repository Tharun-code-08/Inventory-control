import { Module } from '@nestjs/common';
import { MailModule } from '../../common/mail/mail.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { SalesQuotationsController } from './sales-quotations.controller';
import { SalesQuotationsService } from './sales-quotations.service';
import { StockModule } from '../stock/stock.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [StockModule, BillingModule, MailModule, EmailNotificationsModule],
  controllers: [SalesQuotationsController],
  providers: [SalesQuotationsService],
  exports: [SalesQuotationsService],
})
export class SalesQuotationsModule {}
