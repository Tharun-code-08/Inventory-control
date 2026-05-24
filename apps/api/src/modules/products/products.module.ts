import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { StockModule } from '../stock/stock.module';
import { ProductsController } from './products.controller';
import { GstHsnService } from './gst-hsn.service';
import { ProductsService } from './products.service';

@Module({
  imports: [StockModule, BillingModule],
  controllers: [ProductsController],
  providers: [ProductsService, GstHsnService],
})
export class ProductsModule {}
