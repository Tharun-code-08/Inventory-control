import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingCycle,
  PlatformNotificationCategory,
  PlatformNotificationSeverity,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import { PLAN_PRICING } from '../../common/plans/plan-config';
import { PrismaService } from '../../prisma/prisma.service';
import { PLATFORM_NOTIFICATION_KEYS } from './platform-notification.constants';
import { PlatformNotificationService } from './platform-notification.service';

function mrrForCompany(plan: SubscriptionPlan, cycle: BillingCycle | null): number {
  if (plan === SubscriptionPlan.TRIAL) return 0;
  const key = plan === SubscriptionPlan.PLUS ? 'plus' : 'pro';
  const pricing = PLAN_PRICING[key];
  return cycle === BillingCycle.YEARLY ? pricing.yearly.displayPerMonth : pricing.monthly.display;
}

@Injectable()
export class PlatformRevenueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: PlatformNotificationService,
    private readonly config: ConfigService,
  ) {}

  async onTrialStarted(args: { companyId: string; companyName: string }) {
    return this.notifications.dispatch({
      category: PlatformNotificationCategory.REVENUE,
      severity: PlatformNotificationSeverity.INFO,
      notificationKey: PLATFORM_NOTIFICATION_KEYS.TRIAL_STARTED,
      title: 'New trial started',
      message: `${args.companyName} started a trial.`,
      actionUrl: '/platform/subscriptions',
      referenceType: 'COMPANY',
      referenceId: args.companyId,
      companyId: args.companyId,
      dedupeHours: 24,
      emailImmediate: true,
      emailDedupe: {
        templateId: 'platform_trial_started',
        entityType: 'company',
        entityId: args.companyId,
      },
    });
  }

  async onTrialConverted(args: {
    companyId: string;
    companyName: string;
    plan: SubscriptionPlan;
    amountPaise: number;
  }) {
    const amount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(args.amountPaise / 100);

    return this.notifications.dispatch({
      category: PlatformNotificationCategory.REVENUE,
      severity: PlatformNotificationSeverity.HIGH,
      notificationKey: PLATFORM_NOTIFICATION_KEYS.TRIAL_CONVERTED,
      title: 'Trial converted to paid',
      message: `${args.companyName} upgraded to ${args.plan} (${amount}).`,
      actionUrl: '/platform/subscriptions',
      referenceType: 'COMPANY',
      referenceId: args.companyId,
      companyId: args.companyId,
      dedupeHours: 48,
      emailImmediate: true,
      emailDedupe: {
        templateId: 'platform_trial_converted',
        entityType: 'company',
        entityId: args.companyId,
      },
    });
  }

  async onSubscriptionRenewed(args: {
    companyId: string;
    companyName: string;
    plan: SubscriptionPlan;
    amountPaise: number;
    paymentId: string;
  }) {
    const amount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(args.amountPaise / 100);

    return this.notifications.dispatch({
      category: PlatformNotificationCategory.REVENUE,
      severity: PlatformNotificationSeverity.INFO,
      notificationKey: PLATFORM_NOTIFICATION_KEYS.SUBSCRIPTION_RENEWED,
      title: 'Subscription payment received',
      message: `${args.companyName} paid ${amount} for ${args.plan}.`,
      actionUrl: '/platform/subscriptions',
      referenceType: 'SUBSCRIPTION_PAYMENT',
      referenceId: args.paymentId,
      companyId: args.companyId,
      dedupeHours: 12,
      emailImmediate: false,
    });
  }

  async onFailedRenewal(args: {
    companyId: string;
    companyName: string;
    paymentId: string;
    failureReason?: string | null;
    renewalAttempt: number;
  }) {
    return this.notifications.dispatch({
      category: PlatformNotificationCategory.REVENUE,
      severity: PlatformNotificationSeverity.CRITICAL,
      notificationKey: PLATFORM_NOTIFICATION_KEYS.FAILED_RENEWAL,
      title: 'Failed subscription payment',
      message: `${args.companyName} payment failed (attempt ${args.renewalAttempt})${args.failureReason ? `: ${args.failureReason}` : ''}.`,
      actionUrl: '/platform/subscriptions',
      referenceType: 'SUBSCRIPTION_PAYMENT',
      referenceId: args.paymentId,
      companyId: args.companyId,
      dedupeHours: 6,
      emailImmediate: true,
      emailDedupe: {
        templateId: 'platform_failed_renewal',
        entityType: 'subscription_payment',
        entityId: args.paymentId,
      },
    });
  }

  async onSubscriptionCancelled(args: { companyId: string; companyName: string }) {
    return this.notifications.dispatch({
      category: PlatformNotificationCategory.REVENUE,
      severity: PlatformNotificationSeverity.HIGH,
      notificationKey: PLATFORM_NOTIFICATION_KEYS.SUBSCRIPTION_CANCELLED,
      title: 'Subscription expired or cancelled',
      message: `${args.companyName} subscription is no longer active.`,
      actionUrl: '/platform/subscriptions',
      referenceType: 'COMPANY',
      referenceId: args.companyId,
      companyId: args.companyId,
      dedupeHours: 48,
      emailImmediate: true,
      emailDedupe: {
        templateId: 'platform_subscription_cancelled',
        entityType: 'company',
        entityId: args.companyId,
      },
    });
  }

  async checkRevenueMilestones() {
    const milestonesRaw =
      this.config.get<string>('PLATFORM_MRR_MILESTONES_INR') ??
      process.env.PLATFORM_MRR_MILESTONES_INR ??
      '50000,100000,250000,500000';
    const milestones = milestonesRaw
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);

    const paid = await this.prisma.company.findMany({
      where: {
        isActive: true,
        subscriptionPlan: { in: [SubscriptionPlan.PLUS, SubscriptionPlan.PRO] },
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      },
      select: { subscriptionPlan: true, billingCycle: true },
    });

    const mrr = paid.reduce(
      (sum, c) => sum + mrrForCompany(c.subscriptionPlan, c.billingCycle),
      0,
    );

    let dispatched = 0;
    for (const milestone of milestones) {
      if (mrr < milestone) continue;

      const result = await this.notifications.dispatch({
        category: PlatformNotificationCategory.REVENUE,
        severity: PlatformNotificationSeverity.HIGH,
        notificationKey: `${PLATFORM_NOTIFICATION_KEYS.REVENUE_MILESTONE}:${milestone}`,
        title: `Revenue milestone: ₹${milestone.toLocaleString('en-IN')}`,
        message: `MRR has reached ₹${Math.round(mrr).toLocaleString('en-IN')} (milestone ₹${milestone.toLocaleString('en-IN')}).`,
        actionUrl: '/platform/subscriptions',
        referenceType: 'MRR_MILESTONE',
        referenceId: null,
        dedupeHours: 24 * 365,
        emailImmediate: true,
        emailDedupe: {
          templateId: 'platform_revenue_milestone',
          entityType: 'milestone_inr',
          entityId: String(milestone),
        },
      });
      if (!('skipped' in result)) dispatched += 1;
    }

    return { mrr, dispatched };
  }
}
