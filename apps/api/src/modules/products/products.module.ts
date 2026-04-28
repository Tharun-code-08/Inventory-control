import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [StockModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
