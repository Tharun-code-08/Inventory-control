import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { BillingModule } from '../billing/billing.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { DocumentEmailModule } from '../document-email/document-email.module';
import { BrandingModule } from '../../common/branding/branding.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    StockModule,
    BillingModule,
    EmailNotificationsModule,
    DocumentEmailModule,
    BrandingModule,
    PrismaModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfService],
  exports: [InvoicesService, InvoicePdfService],
})
export class InvoicesModule {}

