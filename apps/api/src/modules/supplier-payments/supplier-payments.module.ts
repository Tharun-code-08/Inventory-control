import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { SupplierPaymentsService } from './supplier-payments.service';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { DocumentEmailModule } from '../document-email/document-email.module';

@Module({
  imports: [StockModule, EmailNotificationsModule, DocumentEmailModule],
  controllers: [SupplierPaymentsController],
  providers: [SupplierPaymentsService],
  exports: [SupplierPaymentsService],
})
export class SupplierPaymentsModule {}
