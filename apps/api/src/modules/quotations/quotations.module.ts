import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { RfqsModule } from '../rfqs/rfqs.module';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';

@Module({
  imports: [StockModule, RfqsModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}

