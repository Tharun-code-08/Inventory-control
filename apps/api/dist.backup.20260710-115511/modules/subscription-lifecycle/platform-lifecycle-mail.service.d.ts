import { ConfigService } from '@nestjs/config';
import { MailService } from '../../common/mail/mail.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
export declare class PlatformLifecycleMailService {
    private readonly mail;
    private readonly emailNotifications;
    private readonly config;
    private readonly prisma;
    private readonly logger;
    constructor(mail: MailService, emailNotifications: EmailNotificationsService, config: ConfigService, prisma: PrismaService);
    private webBase;
    sendCampaignEmail(args: {
        companyId: string;
        companyName: string;
        recipient: string;
        campaignKey: string;
        marketingOptOut?: boolean;
        context?: Record<string, string | number | undefined>;
    }): Promise<{
        sent: boolean;
        reason?: string;
    }>;
    sendSubscriptionWelcome(args: {
        companyId: string;
        companyName: string;
        recipient: string;
        planName: string;
        billingCycle: string;
        amountDisplay: string;
        invoiceNumber?: string;
        invoicePdf?: Buffer;
    }): Promise<{
        sent: boolean;
    }>;
    private markEnrollment;
}
