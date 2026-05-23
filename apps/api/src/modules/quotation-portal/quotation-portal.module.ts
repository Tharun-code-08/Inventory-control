import { Module } from '@nestjs/common';
import { QuotationPortalController } from './quotation-portal.controller';
import { QuotationPortalService } from './quotation-portal.service';

@Module({
  controllers: [QuotationPortalController],
  providers: [QuotationPortalService],
})
export class QuotationPortalModule {}
