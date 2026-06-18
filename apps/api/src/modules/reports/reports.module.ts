import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { StockModule } from '../stock/stock.module';
import { BrandingModule } from '../../common/branding/branding.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsPdfService } from './reports-pdf.service';

@Module({
  imports: [
    BillingModule,
    StockModule,
    BullModule.registerQueue({ name: 'exports' }),
    BrandingModule,
    PrismaModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsPdfService],
  exports: [ReportsService, ReportsPdfService],
})
export class ReportsModule {}
