import { Module } from '@nestjs/common';
import { SalesQuotationsController } from './sales-quotations.controller';
import { SalesQuotationsService } from './sales-quotations.service';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  controllers: [SalesQuotationsController],
  providers: [SalesQuotationsService],
  exports: [SalesQuotationsService],
})
export class SalesQuotationsModule {}
