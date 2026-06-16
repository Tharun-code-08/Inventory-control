import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GoodsIssuesController } from './goods-issues.controller';
import { GoodsIssuesService } from './goods-issues.service';

@Module({
  imports: [StockModule, NotificationsModule],
  controllers: [GoodsIssuesController],
  providers: [GoodsIssuesService],
})
export class GoodsIssuesModule {}
