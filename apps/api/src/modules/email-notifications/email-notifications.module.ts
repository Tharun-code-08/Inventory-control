import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailModule } from '../../common/mail/mail.module';
import { PdfModule } from '../../common/pdf/pdf.module';
import { CommonPdfModule } from '../../common/pdf/common-pdf.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailSendersModule } from '../email-senders/email-senders.module';
import { EmailNotificationsController } from './email-notifications.controller';
import { EmailNotificationsService } from './email-notifications.service';
import { PAYMENT_REMINDER_QUEUE } from './payment-reminder.constants';
import { PaymentReminderProcessor } from './payment-reminder.processor';
import { PaymentReminderScheduler } from './payment-reminder.scheduler';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    PdfModule,
    CommonPdfModule,
    forwardRef(() => EmailSendersModule),
    BullModule.registerQueue({ name: PAYMENT_REMINDER_QUEUE }),
  ],
  controllers: [EmailNotificationsController],
  providers: [EmailNotificationsService, PaymentReminderProcessor, PaymentReminderScheduler],
  exports: [EmailNotificationsService],
})
export class EmailNotificationsModule implements OnModuleInit {
  constructor(private readonly scheduler: PaymentReminderScheduler) {}

  onModuleInit() {
    void this.scheduler.registerRepeatableJob();
  }
}
