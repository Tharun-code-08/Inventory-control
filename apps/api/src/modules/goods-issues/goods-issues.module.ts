import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BrandingModule } from '../../common/branding/branding.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { GoodsIssuesController } from './goods-issues.controller';
import { GoodsIssuesService } from './goods-issues.service';
import { GoodsIssuePdfService } from './goods-issue-pdf.service';

@Module({
  imports: [StockModule, NotificationsModule, BrandingModule, PrismaModule],
  controllers: [GoodsIssuesController],
  providers: [GoodsIssuesService, GoodsIssuePdfService],
  exports: [GoodsIssuesService, GoodsIssuePdfService],
})
export class GoodsIssuesModule {}
