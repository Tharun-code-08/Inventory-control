import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [PrismaModule, StockModule],
  controllers: [HealthController],
})
export class HealthModule {}
