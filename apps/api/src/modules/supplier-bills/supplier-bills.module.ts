import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { SupplierBillsController } from './supplier-bills.controller';
import { SupplierBillsService } from './supplier-bills.service';

@Module({
  imports: [StockModule],
  controllers: [SupplierBillsController],
  providers: [SupplierBillsService],
  exports: [SupplierBillsService],
})
export class SupplierBillsModule {}
