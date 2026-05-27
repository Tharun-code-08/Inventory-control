import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { BillingModule } from '../billing/billing.module';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [BillingModule, StockModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}

