import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BrandingModule } from '../../common/branding/branding.module';
import { EwayBillsController } from './eway-bills.controller';
import { EwayBillsService } from './eway-bills.service';
import { EWayBillPdfService } from './eway-bill-pdf.service';

@Module({
  imports: [PrismaModule, BrandingModule],
  controllers: [EwayBillsController],
  providers: [EwayBillsService, EWayBillPdfService],
  exports: [EwayBillsService, EWayBillPdfService],
})
export class EwayBillsModule {}
