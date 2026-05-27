import { Global, Module, forwardRef } from '@nestjs/common';
import { EmailSendersModule } from '../../modules/email-senders/email-senders.module';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [forwardRef(() => EmailSendersModule)],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
