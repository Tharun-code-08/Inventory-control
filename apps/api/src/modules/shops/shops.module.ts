import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { BrandingModule } from '../../common/branding/branding.module';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';

@Module({
  imports: [BillingModule, BrandingModule],
  controllers: [ShopsController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}
