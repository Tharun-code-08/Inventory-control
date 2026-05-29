import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { BillingModule } from '../billing/billing.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { DocumentEmailModule } from '../document-email/document-email.module';

@Module({
  imports: [StockModule, BillingModule, EmailNotificationsModule, DocumentEmailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

