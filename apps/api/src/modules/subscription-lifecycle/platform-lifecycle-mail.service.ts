import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LifecycleCampaignStatus } from '@prisma/client';
import {
  lifecycleEmailHtml,
  lifecycleEmailSubject,
  lifecycleEmailText,
} from '../../common/mail/platform/lifecycle-email.template';
import {
  subscriptionWelcomeHtml,
  subscriptionWelcomeSubject,
  subscriptionWelcomeText,
} from '../../common/mail/platform/subscription-welcome.template';
import {
  trialWelcomeHtml,
  trialWelcomeSubject,
  trialWelcomeText,
} from '../../common/mail/platform/trial-welcome.template';
import { MailService } from '../../common/mail/mail.service';
import { getTrialDays } from '../../common/plans/plan-config';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { LIFECYCLE_CAMPAIGN_MAP } from './lifecycle-rules.constants';
import {
  marketingUnsubscribeUrl,
  platformWebBaseUrl,
} from './subscription-lifecycle.constants';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlatformLifecycleMailService {
  private readonly logger = new Logger(PlatformLifecycleMailService.name);

  constructor(
    private readonly mail: MailService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private webBase(): string {
    return platformWebBaseUrl(this.config.get<string>('WEB_APP_URL'));
  }

  async sendCampaignEmail(args: {
    companyId: string;
    companyName: string;
    recipient: string;
    campaignKey: string;
    marketingOptOut?: boolean;
    context?: Record<string, string | number | undefined>;
  }): Promise<{ sent: boolean; reason?: string }> {
    const campaign = LIFECYCLE_CAMPAIGN_MAP.get(args.campaignKey);
    if (!campaign) return { sent: false, reason: 'Unknown campaign' };

    if (campaign.marketing && args.marketingOptOut) {
      await this.markEnrollment(args.companyId, args.campaignKey, LifecycleCampaignStatus.SKIPPED);
      return { sent: false, reason: 'Marketing opt-out' };
    }

    if (!this.mail.isConfigured()) {
      return { sent: false, reason: 'SMTP not configured' };
    }

    const templateId = args.campaignKey.startsWith('platform_')
      ? args.campaignKey
      : `platform_${args.campaignKey}`;

    const alreadySent = await this.emailNotifications.hasDeliveryLog({
      templateId,
      entityType: 'company',
      entityId: args.companyId,
      recipient: args.recipient,
    });
    if (alreadySent) return { sent: false, reason: 'Already sent' };

    const baseUrl = this.webBase();
    const loginUrl = `${baseUrl}/login`;
    const upgradeUrl = `${baseUrl}${campaign.ctaPath ?? '/upgrade'}`;
    const unsubscribeUrl = marketingUnsubscribeUrl(baseUrl, args.companyId);

    const content = {
      title: args.context?.title?.toString() ?? campaign.title,
      subtitle: campaign.subtitle,
      greeting: `Hi ${args.companyName},`,
      paragraphs: campaign.paragraphs.map((p) =>
        p.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(args.context?.[key] ?? '')),
      ),
      bullets: campaign.bullets,
      cta: campaign.ctaPath
        ? { label: campaign.ctaLabel ?? 'Open Retail IMS', url: upgradeUrl }
        : undefined,
      unsubscribeUrl: campaign.transactional ? undefined : unsubscribeUrl,
      transactional: campaign.transactional,
    };

    const subject = lifecycleEmailSubject(content.title, args.companyName);
    const text = lifecycleEmailText(content);
    let html = lifecycleEmailHtml(content);

    if (campaign.key === 'platform_trial_welcome') {
      const trialDays = getTrialDays();
      const trialEndsAt = args.context?.trialEndsAt?.toString() ?? '';
      html = trialWelcomeHtml({
        companyName: args.companyName,
        trialDays,
        trialEndsAt,
        loginUrl,
        upgradeUrl,
        unsubscribeUrl,
      });
    }

    const delivery = await this.mail.sendPlatformMail({
      to: args.recipient,
      subject:
        campaign.key === 'platform_trial_welcome'
          ? trialWelcomeSubject({
              companyName: args.companyName,
              trialDays: getTrialDays(),
              trialEndsAt: args.context?.trialEndsAt?.toString() ?? '',
              loginUrl,
              upgradeUrl,
            })
          : subject,
      text:
        campaign.key === 'platform_trial_welcome'
          ? trialWelcomeText({
              companyName: args.companyName,
              trialDays: getTrialDays(),
              trialEndsAt: args.context?.trialEndsAt?.toString() ?? '',
              loginUrl,
              upgradeUrl,
            })
          : text,
      html,
    });

    void delivery;

    await this.emailNotifications.logDelivery({
      templateId,
      entityType: 'company',
      entityId: args.companyId,
      recipient: args.recipient,
    });

    await this.markEnrollment(args.companyId, args.campaignKey, LifecycleCampaignStatus.SENT);
    this.logger.log(`Sent ${args.campaignKey} to ${args.recipient} (company ${args.companyId})`);
    return { sent: true };
  }

  async sendSubscriptionWelcome(args: {
    companyId: string;
    companyName: string;
    recipient: string;
    planName: string;
    billingCycle: string;
    amountDisplay: string;
    invoiceNumber?: string;
    invoicePdf?: Buffer;
  }) {
    const templateId = 'platform_subscription_welcome';
    const alreadySent = await this.emailNotifications.hasDeliveryLog({
      templateId,
      entityType: 'company',
      entityId: args.companyId,
      recipient: args.recipient,
    });
    if (alreadySent || !this.mail.isConfigured()) return { sent: false };

    const loginUrl = `${this.webBase()}/login`;
    const ctx = {
      companyName: args.companyName,
      planName: args.planName,
      billingCycle: args.billingCycle,
      amountDisplay: args.amountDisplay,
      loginUrl,
      invoiceNumber: args.invoiceNumber,
    };

    await this.mail.sendPlatformMail({
      to: args.recipient,
      subject: subscriptionWelcomeSubject(ctx),
      text: subscriptionWelcomeText(ctx),
      html: subscriptionWelcomeHtml(ctx),
      attachments: args.invoicePdf
        ? [
            {
              filename: args.invoiceNumber ? `${args.invoiceNumber}.pdf` : 'subscription-invoice.pdf',
              content: args.invoicePdf,
              contentType: 'application/pdf',
            },
          ]
        : undefined,
    });

    await this.emailNotifications.logDelivery({
      templateId,
      entityType: 'company',
      entityId: args.companyId,
      recipient: args.recipient,
    });

    await this.markEnrollment(args.companyId, 'platform_subscription_welcome', LifecycleCampaignStatus.SENT);
    return { sent: true };
  }

  private async markEnrollment(
    companyId: string,
    campaignKey: string,
    status: LifecycleCampaignStatus,
    emailDeliveryLogId?: string,
  ) {
    await this.prisma.lifecycleCampaignEnrollment.upsert({
      where: { companyId_campaignKey: { companyId, campaignKey } },
      create: {
        companyId,
        campaignKey,
        status,
        sentAt: status === LifecycleCampaignStatus.SENT ? new Date() : undefined,
        emailDeliveryLogId,
      },
      update: {
        status,
        sentAt: status === LifecycleCampaignStatus.SENT ? new Date() : undefined,
        emailDeliveryLogId,
      },
    });
  }
}
