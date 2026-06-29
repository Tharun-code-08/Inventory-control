import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PdfModule } from '../../common/pdf/pdf.module';
import { CommonPdfModule } from '../../common/pdf/common-pdf.module';
import { MailModule } from '../../common/mail/mail.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailNotificationsModule } from '../email-notifications/email-notifications.module';
import { DOCUMENT_EMAIL_QUEUE } from './document-email.constants';
import { DocumentEmailProcessor } from './document-email.processor';
import { DocumentEmailService } from './document-email.service';
import { ReturnImageStorageService } from '../../common/upload/return-image-storage.service';

@Module({
  imports: [
    PrismaModule,
    PdfModule,
    CommonPdfModule,
    MailModule,
    EmailNotificationsModule,
    BullModule.registerQueue({ name: DOCUMENT_EMAIL_QUEUE }),
  ],
  providers: [DocumentEmailService, DocumentEmailProcessor, ReturnImageStorageService],
  exports: [DocumentEmailService],
})
export class DocumentEmailModule {}
