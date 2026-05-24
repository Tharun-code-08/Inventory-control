import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { BillingModule } from '../billing/billing.module';
import { RfqsController } from './rfqs.controller';
import { RfqsService } from './rfqs.service';

@Module({
  imports: [StockModule, BillingModule],
  controllers: [RfqsController],
  providers: [RfqsService],
  exports: [RfqsService],
})
export class RfqsModule {}

