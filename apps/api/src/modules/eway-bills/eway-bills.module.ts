import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EwayBillsController } from './eway-bills.controller';
import { EwayBillsService } from './eway-bills.service';

@Module({
  imports: [PrismaModule],
  controllers: [EwayBillsController],
  providers: [EwayBillsService],
  exports: [EwayBillsService],
})
export class EwayBillsModule {}
