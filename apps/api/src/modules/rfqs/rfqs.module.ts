import { Module } from '@nestjs/common';
import { MailModule } from '../../common/mail/mail.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { StockModule } from '../stock/stock.module';
import { BillingModule } from '../billing/billing.module';
import { RfqsController } from './rfqs.controller';
import { RfqsService } from './rfqs.service';

@Module({
  imports: [StockModule, BillingModule, MailModule, EmailNotificationsModule],
  controllers: [RfqsController],
  providers: [RfqsService],
  exports: [RfqsService],
})
export class RfqsModule {}

