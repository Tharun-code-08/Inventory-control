import { Module } from '@nestjs/common';
import { PdfModule } from '../../common/pdf/pdf.module';
import { StockModule } from '../stock/stock.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { DocumentEmailModule } from '../document-email/document-email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BrandingModule } from '../../common/branding/branding.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';
import { GoodsReceiptPdfService } from './goods-receipt-pdf.service';

@Module({
  imports: [
    StockModule,
    EmailNotificationsModule,
    PdfModule,
    DocumentEmailModule,
    NotificationsModule,
    BrandingModule,
    PrismaModule,
  ],
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService, GoodsReceiptPdfService],
  exports: [GoodsReceiptsService, GoodsReceiptPdfService],
})
export class GoodsReceiptsModule {}
