import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { GoodsIssuesController } from './goods-issues.controller';
import { GoodsIssuesService } from './goods-issues.service';

@Module({
  imports: [StockModule],
  controllers: [GoodsIssuesController],
  providers: [GoodsIssuesService],
})
export class GoodsIssuesModule {}
