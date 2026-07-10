import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from '../../common/mail/mail.service';
import { DocumentPdfService } from '../../common/pdf/document-pdf.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailNotificationsService } from './email-notifications.service';
export declare class PaymentReminderProcessor extends WorkerHost {
    private readonly prisma;
    private readonly mail;
    private readonly emailNotifications;
    private readonly documentPdf;
    private readonly logger;
    constructor(prisma: PrismaService, mail: MailService, emailNotifications: EmailNotificationsService, documentPdf: DocumentPdfService);
    process(_job: Job): Promise<{
        sent: number;
        skipped: string;
    } | {
        sent: number;
        skipped?: undefined;
    }>;
}
