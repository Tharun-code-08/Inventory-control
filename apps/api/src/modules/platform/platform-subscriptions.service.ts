import { Injectable } from '@nestjs/common';
import { BillingCycle, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { PLAN_PRICING } from '../../common/plans/plan-config';
import { PrismaService } from '../../prisma/prisma.service';

function mrrForCompany(plan: SubscriptionPlan, cycle: BillingCycle | null): number {
  if (plan === SubscriptionPlan.TRIAL) return 0;
  const key = plan === SubscriptionPlan.PLUS ? 'plus' : 'pro';
  const pricing = PLAN_PRICING[key];
  if (cycle === BillingCycle.YEARLY) {
    return pricing.yearly.displayPerMonth;
  }
  return pricing.monthly.display;
}

@Injectable()
export class PlatformSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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
        createdAt: true,
        paidActivatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // Single pass over companies to derive all partitions — avoids 6+ O(n) filter passes.
    const trialExpiry7d = now.getTime() + 7 * 24 * 60 * 60 * 1000;
    const trials: typeof companies = [];
    const activeTrials: typeof companies = [];
    const expiringTrials: typeof companies = [];
    const paid: typeof companies = [];
    let trialStarts30d = 0;
    let churnExpired = 0;

    for (const c of companies) {
      if (c.subscriptionPlan === SubscriptionPlan.TRIAL) {
        trials.push(c);
        if (c.subscriptionStatus === SubscriptionStatus.ACTIVE) activeTrials.push(c);
        if (
          c.trialEndsAt &&
          c.trialEndsAt.getTime() > now.getTime() &&
          c.trialEndsAt.getTime() <= trialExpiry7d
        ) {
          expiringTrials.push(c);
        }
        if (c.trialStartsAt && c.trialStartsAt >= thirtyDays) trialStarts30d++;
      } else if (c.subscriptionStatus === SubscriptionStatus.ACTIVE) {
        paid.push(c);
      }
      if (c.subscriptionStatus === SubscriptionStatus.EXPIRED) churnExpired++;
    }

    const conversions = await this.prisma.subscriptionPayment.count({
      where: {
        status: 'paid',
        consumedAt: { gte: thirtyDays },
        plan: { in: [SubscriptionPlan.PRO, SubscriptionPlan.PLUS] },
      },
    });

    const conversionRate = trialStarts30d > 0 ? Math.round((100 * conversions) / trialStarts30d) : 0;

    const mrr = paid.reduce((sum, c) => sum + mrrForCompany(c.subscriptionPlan, c.billingCycle), 0);

    const upcomingRenewals = paid
      .filter(
        (c) =>
          c.subscriptionEndsAt &&
          c.subscriptionEndsAt.getTime() > now.getTime() &&
          c.subscriptionEndsAt.getTime() <= now.getTime() + 30 * 24 * 60 * 60 * 1000,
      )
      .map((c) => ({
        companyId: c.id,
        companyName: c.companyName,
        plan: c.subscriptionPlan,
        renewsAt: c.subscriptionEndsAt?.toISOString() ?? null,
      }));

    const failedPayments = await this.prisma.subscriptionPayment.findMany({
      where: { status: 'failed' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { company: { select: { companyName: true } } },
    });

    const emailStats = await this.prisma.emailDeliveryLog.groupBy({
      by: ['templateId'],
      where: { templateId: { startsWith: 'platform_' } },
      _count: { _all: true },
      _sum: { clickCount: true, openCount: true },
    });

    const recentSnapshots = await this.prisma.companyEngagementSnapshot.findMany({
      orderBy: { snapshotDate: 'desc' },
      take: 50,
      include: { company: { select: { companyName: true } } },
    });

    return {
      kpis: {
        totalTrials: trials.length,
        activeTrials: activeTrials.length,
        expiringTrials: expiringTrials.length,
        paidSubscribers: paid.length,
        conversions30d: conversions,
        conversionRate30d: conversionRate,
        mrrInr: mrr,
        arrInr: mrr * 12,
        churnExpired,
      },
      upcomingRenewals,
      failedPayments: failedPayments.map((p) => ({
        id: p.id,
        companyName: p.company?.companyName ?? '—',
        plan: p.plan,
        amountPaise: p.amountPaise,
        failureReason: p.failureReason,
        renewalAttempt: p.renewalAttempt,
        createdAt: p.createdAt.toISOString(),
      })),
      emailAnalytics: emailStats.map((row) => ({
        templateId: row.templateId,
        sent: row._count._all,
        clicks: row._sum.clickCount ?? 0,
        opens: row._sum.openCount ?? 0,
      })),
      lifecycleStages: recentSnapshots.map((s) => ({
        companyName: s.company.companyName,
        stage: s.lifecycleStage,
        trialProgressPct: s.trialProgressPct,
        snapshotDate: s.snapshotDate.toISOString().slice(0, 10),
      })),
      recentSubscribers: companies.slice(0, 20).map((c) => ({
        id: c.id,
        companyName: c.companyName,
        plan: c.subscriptionPlan,
        status: c.subscriptionStatus,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }
}
