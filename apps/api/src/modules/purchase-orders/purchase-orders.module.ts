import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { RfqsModule } from '../rfqs/rfqs.module';
import { StockModule } from '../stock/stock.module';
import { PdfModule } from '../../common/pdf/pdf.module';
import { DocumentEmailModule } from '../document-email/document-email.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PoCancelService } from './po-cancel.service';

@Module({
  imports: [StockModule, BillingModule, RfqsModule, PdfModule, DocumentEmailModule, EmailNotificationsModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService, PoCancelService],
})
export class PurchaseOrdersModule {}
