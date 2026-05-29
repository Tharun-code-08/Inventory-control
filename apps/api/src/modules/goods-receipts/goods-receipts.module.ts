import { Module } from '@nestjs/common';
import { PdfModule } from '../../common/pdf/pdf.module';
import { StockModule } from '../stock/stock.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { DocumentEmailModule } from '../document-email/document-email.module';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';

@Module({
  imports: [StockModule, EmailNotificationsModule, PdfModule, DocumentEmailModule],
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService],
})
export class GoodsReceiptsModule {}
