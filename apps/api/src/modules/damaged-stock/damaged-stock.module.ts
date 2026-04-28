import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { DamagedStockController } from './damaged-stock.controller';
import { DamagedStockService } from './damaged-stock.service';

@Module({
  imports: [StockModule],
  controllers: [DamagedStockController],
  providers: [DamagedStockService],
})
export class DamagedStockModule {}
