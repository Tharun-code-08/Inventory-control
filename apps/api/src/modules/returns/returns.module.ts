import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StockModule } from '../stock/stock.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { DocumentEmailModule } from '../document-email/document-email.module';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';

@Module({
  imports: [PrismaModule, StockModule, EmailNotificationsModule, DocumentEmailModule],
  controllers: [ReturnsController],
  providers: [ReturnsService],
})
export class ReturnsModule {}
