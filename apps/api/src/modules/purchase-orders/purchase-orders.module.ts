import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { RfqsModule } from '../rfqs/rfqs.module';
import { StockModule } from '../stock/stock.module';
import { MailModule } from '../../common/mail/mail.module';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PoCancelService } from './po-cancel.service';

@Module({
  imports: [StockModule, BillingModule, RfqsModule, MailModule, BullModule.registerQueue({ name: 'exports' })],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService, PoCancelService],
})
export class PurchaseOrdersModule {}
