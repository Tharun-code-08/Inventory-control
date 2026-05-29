import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { SupplierBillsController } from './supplier-bills.controller';
import { SupplierBillsService } from './supplier-bills.service';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { DocumentEmailModule } from '../document-email/document-email.module';

@Module({
  imports: [StockModule, EmailNotificationsModule, DocumentEmailModule],
  controllers: [SupplierBillsController],
  providers: [SupplierBillsService],
  exports: [SupplierBillsService],
})
export class SupplierBillsModule {}
