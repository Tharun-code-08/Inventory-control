import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { StockTransfersController } from './stock-transfers.controller';
import { StockTransfersService } from './stock-transfers.service';

@Module({
  imports: [StockModule],
  controllers: [StockTransfersController],
  providers: [StockTransfersService],
})
export class StockTransfersModule {}
