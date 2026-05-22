import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { SupplierPortalController } from './supplier-portal.controller';
import { SupplierPortalService } from './supplier-portal.service';

@Module({
  imports: [StockModule],
  controllers: [SupplierPortalController],
  providers: [SupplierPortalService],
})
export class SupplierPortalModule {}
