import { Module } from '@nestjs/common';
import { StockModule } from '../stock/stock.module';
import { RfqsController } from './rfqs.controller';
import { RfqsService } from './rfqs.service';

@Module({
  imports: [StockModule],
  controllers: [RfqsController],
  providers: [RfqsService],
  exports: [RfqsService],
})
export class RfqsModule {}

