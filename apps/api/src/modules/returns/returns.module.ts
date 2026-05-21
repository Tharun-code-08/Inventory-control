import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StockModule } from '../stock/stock.module';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';

@Module({
  imports: [PrismaModule, StockModule],
  controllers: [ReturnsController],
  providers: [ReturnsService],
})
export class ReturnsModule {}
