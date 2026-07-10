import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from "../../../prisma/prisma.service";
import { ReportsService } from "../../reports/reports.service";
import { WhatsAppAdapter } from '../channels/whatsapp/whatsapp.adapter';
import { LinkService } from '../link/link.service';
import { type NotificationJob } from './notification-jobs';
export declare class NotificationProcessor extends WorkerHost {
    private readonly prisma;
    private readonly reports;
    private readonly links;
    private readonly adapter;
    private readonly logger;
    constructor(prisma: PrismaService, reports: ReportsService, links: LinkService, adapter: WhatsAppAdapter);
    process(job: Job<NotificationJob>): Promise<{
        sent: number;
    }>;
    private buildDailySummary;
    private buildLowStockAlert;
    private buildOverduePayment;
    private resolveUserName;
    private resolveCompanyName;
    private activeLinks;
    private sendToLink;
    private getOrCreateConversation;
}
