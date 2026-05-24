import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';

@Module({
  imports: [BillingModule],
  controllers: [ShopsController],
  providers: [ShopsService],
})
export class ShopsModule {}
