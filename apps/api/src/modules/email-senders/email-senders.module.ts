import { Module, forwardRef } from '@nestjs/common';
import { MailModule } from '../../common/mail/mail.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailSenderController } from './email-sender.controller';
import { EmailSenderService } from './email-sender.service';

@Module({
  imports: [PrismaModule, forwardRef(() => MailModule)],
  controllers: [EmailSenderController],
  providers: [EmailSenderService],
  exports: [EmailSenderService],
})
export class EmailSendersModule {}
