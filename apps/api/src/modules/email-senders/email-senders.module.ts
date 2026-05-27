import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailSenderController } from './email-sender.controller';
import { EmailSenderService } from './email-sender.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmailSenderController],
  providers: [EmailSenderService],
  exports: [EmailSenderService],
})
export class EmailSendersModule {}
