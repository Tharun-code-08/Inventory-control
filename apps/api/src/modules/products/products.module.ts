import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { DocumentSeriesModule } from '../document-series/document-series.module';
import { StockModule } from '../stock/stock.module';
import { ProductImageStorageService } from '../../common/upload/product-image-storage.service';
import { ProductsController } from './products.controller';
import { GstHsnService } from './gst-hsn.service';
import { ProductsService } from './products.service';

@Module({
  imports: [StockModule, BillingModule, DocumentSeriesModule],
  controllers: [ProductsController],
  providers: [ProductsService, GstHsnService, ProductImageStorageService],
})
export class ProductsModule {}
