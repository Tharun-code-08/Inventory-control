import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EngagementTrackerService } from './engagement-tracker.service';
import { LifecycleOrchestratorService } from './lifecycle-orchestrator.service';
import { PlatformLifecycleMailService } from './platform-lifecycle-mail.service';
import { SUBSCRIPTION_LIFECYCLE_QUEUE } from './subscription-lifecycle.constants';

@Processor(SUBSCRIPTION_LIFECYCLE_QUEUE)
export class SubscriptionLifecycleProcessor extends WorkerHost {
  private readonly logger = new Logger(SubscriptionLifecycleProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly engagement: EngagementTrackerService,
    private readonly lifecycleMail: PlatformLifecycleMailService,
    private readonly orchestrator: LifecycleOrchestratorService,
  ) {
    super();
  }

  async process(_job: Job) {
    void _job;
    if (!this.mail.isConfigured()) {
      this.logger.warn('Lifecycle job skipped: SMTP not configured');
      return { sent: 0, skipped: 'SMTP not configured' };
    }

    const today = new Date();
    await this.engagement.runDailySnapshot(today);

    const expiredTrialIds = await this.engagement.expireTrialsPastEnd(today);
    for (const companyId of expiredTrialIds) {
      const owner = await this.orchestrator.resolveOwnerEmail(companyId);
      if (owner) {
        await this.orchestrator.onTrialExpired({
          companyId,
          ownerEmail: owner.email,
          companyName: owner.companyName,
        });
      }
    }

    const companies = await this.prisma.company.findMany({
      where: { isActive: true },
      select: {
        id: true,
        companyName: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        trialStartsAt: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
        billingCycle: true,
        paidActivatedAt: true,
        createdAt: true,
        platformMarketingOptOut: true,
      },
    });

    const snapshotDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    let sent = 0;

    for (const company of companies) {
      const snapshot = await this.prisma.companyEngagementSnapshot.findUnique({
        where: { companyId_snapshotDate: { companyId: company.id, snapshotDate } },
      });

      const keys = this.engagement.eligibleCampaignKeys(
        company,
        today,
        snapshot
          ? {
              lastLoginAt: snapshot.lastLoginAt,
              featuresUsed: snapshot.featuresUsed as Record<string, boolean>,
            }
          : undefined,
      );

      if (keys.length === 0) continue;

      const owner = await this.orchestrator.resolveOwnerEmail(company.id);
      if (!owner) continue;

      for (const campaignKey of keys) {
        const result = await this.lifecycleMail.sendCampaignEmail({
          companyId: company.id,
          companyName: company.companyName,
          recipient: owner.email,
          campaignKey,
          marketingOptOut: company.platformMarketingOptOut,
        });
        if (result.sent) sent += 1;
      }
    }

    this.logger.log(`Lifecycle daily job complete: ${sent} emails sent`);
    return { sent, expiredTrials: expiredTrialIds.length };
  }
}
