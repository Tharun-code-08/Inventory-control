import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { SupplierPortalController } from './supplier-portal.controller';
import { SupplierPortalService } from './supplier-portal.service';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [StockModule, BillingModule, NotificationsModule],
  controllers: [SupplierPortalController],
  providers: [SupplierPortalService],
})
export class SupplierPortalModule {}
