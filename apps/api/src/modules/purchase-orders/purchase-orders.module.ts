import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';

@Module({
  imports: [StockModule, BullModule.registerQueue({ name: 'exports' })],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
