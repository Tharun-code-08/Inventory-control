import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [StockModule, BillingModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

