import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingCycle,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import {
  isDowngrade,
  planAllowsFeature,
  PLAN_LIMITS,
  subscriptionEndDate,
  trialEndDate,
  getTrialDays,
} from '../../common/plans/plan-config';
import { PrismaService } from '../../prisma/prisma.service';

export type SubscriptionSnapshot = {
  plan: SubscriptionPlan;
  billingCycle: BillingCycle | null;
  status: SubscriptionStatus;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  daysLeftInTrial: number | null;
  isTrialExpired: boolean;
  lifecycleStage: string | null;
  trialProgressPct: number | null;
  limits: {
    maxUsers: number | null;
    maxWarehouses: number | null;
    maxSkus: number | null;
  };
  features: {
    reports: boolean;
    purchaseOrders: boolean;
    rfqs: boolean;
    contracts: boolean;
    salesOrders: boolean;
    salesQuotations: boolean;
    invoices: boolean;
    payments: boolean;
    supplierPortal: boolean;
    integrations: boolean;
    api: boolean;
    vendorPortal: boolean;
    auditRbac: boolean;
    backups: boolean;
  };
};

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveCompanyIdForUser(user: RequestUser): Promise<string | null> {
    if (!user.shopId) return null;
    const shop = await this.prisma.shop.findUnique({
      where: { id: user.shopId },
      select: { companyId: true },
    });
    return shop?.companyId ?? null;
  }

  async getSnapshotForUser(user: RequestUser): Promise<SubscriptionSnapshot | null> {
    const companyId = await this.resolveCompanyIdForUser(user);
    if (!companyId) return null;
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return null;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const snapshot = await this.prisma.companyEngagementSnapshot.findUnique({
      where: { companyId_snapshotDate: { companyId, snapshotDate: today } },
      select: { lifecycleStage: true, trialProgressPct: true },
    });

    const base = this.toSnapshot(company);
    return {
      ...base,
      lifecycleStage: snapshot?.lifecycleStage ?? null,
      trialProgressPct: snapshot?.trialProgressPct ?? null,
    };
  }

  toSnapshot(company: {
    subscriptionPlan: SubscriptionPlan;
    billingCycle: BillingCycle | null;
    subscriptionStatus: SubscriptionStatus;
    trialStartsAt: Date | null;
    trialEndsAt: Date | null;
    subscriptionEndsAt: Date | null;
  }): SubscriptionSnapshot {
    const now = Date.now();
    const trialEnds = company.trialEndsAt?.getTime() ?? null;
    const isTrial = company.subscriptionPlan === SubscriptionPlan.TRIAL;
    const isTrialExpired =
      isTrial && company.subscriptionStatus === SubscriptionStatus.EXPIRED
        ? true
        : isTrial && trialEnds != null
          ? trialEnds < now
          : false;

    const limitsKey = company.subscriptionPlan === SubscriptionPlan.PLUS ? 'PLUS' : company.subscriptionPlan === SubscriptionPlan.PRO ? 'PRO' : 'TRIAL';
    const limits = PLAN_LIMITS[limitsKey];

    return {
      plan: company.subscriptionPlan,
      billingCycle: company.billingCycle,
      status: company.subscriptionStatus,
      trialStartsAt: company.trialStartsAt?.toISOString() ?? null,
      trialEndsAt: company.trialEndsAt?.toISOString() ?? null,
      subscriptionEndsAt: company.subscriptionEndsAt?.toISOString() ?? null,
      daysLeftInTrial:
        isTrial && trialEnds != null
          ? Math.max(0, Math.ceil((trialEnds - now) / (24 * 60 * 60 * 1000)))
          : null,
      isTrialExpired,
      lifecycleStage: null,
      trialProgressPct: null,
      limits: {
        maxUsers: limits.maxUsers,
        maxWarehouses: limits.maxWarehouses,
        maxSkus: limits.maxSkus,
      },
      features: {
        reports: planAllowsFeature(company.subscriptionPlan, 'reports'),
        purchaseOrders: planAllowsFeature(company.subscriptionPlan, 'purchase_orders'),
        rfqs: planAllowsFeature(company.subscriptionPlan, 'rfqs'),
        contracts: planAllowsFeature(company.subscriptionPlan, 'contracts'),
        salesOrders: planAllowsFeature(company.subscriptionPlan, 'sales_orders'),
        salesQuotations: planAllowsFeature(company.subscriptionPlan, 'sales_quotations'),
        invoices: planAllowsFeature(company.subscriptionPlan, 'invoices'),
        payments: planAllowsFeature(company.subscriptionPlan, 'payments'),
        supplierPortal: planAllowsFeature(company.subscriptionPlan, 'supplier_portal'),
        integrations: planAllowsFeature(company.subscriptionPlan, 'integrations'),
        api: planAllowsFeature(company.subscriptionPlan, 'api'),
        vendorPortal: planAllowsFeature(company.subscriptionPlan, 'vendor_portal'),
        auditRbac: planAllowsFeature(company.subscriptionPlan, 'audit_rbac'),
        backups: planAllowsFeature(company.subscriptionPlan, 'backups'),
      },
    };
  }

  private readonly writeBlockCache = new Map<string, { at: number; reason: string | null }>();

  /**
   * Why this company may not create or change data right now (null = it may).
   * A paid plan becomes read-only once `subscriptionEndsAt` is more than
   * SUBSCRIPTION_GRACE_DAYS (default 3) in the past, or when it is marked
   * EXPIRED/SUSPENDED; an ended trial is read-only straight away. Companies
   * with no end date recorded are never blocked. Cached briefly because the
   * guard runs on every write request.
   */
  async writeBlockReason(companyId: string): Promise<string | null> {
    const cached = this.writeBlockCache.get(companyId);
    if (cached && Date.now() - cached.at < 60_000) return cached.reason;

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        subscriptionPlan: true,
        billingCycle: true,
        subscriptionStatus: true,
        trialStartsAt: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
      },
    });
    let reason: string | null = null;
    if (company) {
      const graceDays = Number(process.env.SUBSCRIPTION_GRACE_DAYS ?? 3);
      const graceMs = (Number.isFinite(graceDays) && graceDays >= 0 ? graceDays : 3) * 24 * 60 * 60 * 1000;
      if (company.subscriptionPlan === SubscriptionPlan.TRIAL) {
        if (this.toSnapshot(company).isTrialExpired) {
          reason = `Your ${getTrialDays()}-day trial has ended. Your data is read-only until you upgrade.`;
        }
      } else if (
        company.subscriptionStatus === SubscriptionStatus.EXPIRED ||
        company.subscriptionStatus === SubscriptionStatus.SUSPENDED ||
        (company.subscriptionEndsAt && company.subscriptionEndsAt.getTime() + graceMs < Date.now())
      ) {
        reason = 'Your subscription has expired. Your data is read-only until you renew.';
      }
    }
    this.writeBlockCache.set(companyId, { at: Date.now(), reason });
    return reason;
  }

  /** Drop the cached read-only state after a plan change. */
  clearWriteBlockCache(companyId: string): void {
    this.writeBlockCache.delete(companyId);
  }

  async assertActiveSubscription(companyId: string): Promise<void> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    const snap = this.toSnapshot(company);
    if (snap.isTrialExpired) {
      throw new ForbiddenException(
        `Your ${getTrialDays()}-day trial has ended. Upgrade to Pro or Plus to continue using SoftdigitIMS.`,
      );
    }
    if (
      company.subscriptionStatus === SubscriptionStatus.EXPIRED &&
      company.subscriptionPlan !== SubscriptionPlan.TRIAL
    ) {
      throw new ForbiddenException('Your subscription has expired. Please renew to continue.');
    }
  }

  async assertFeature(companyId: string, feature: Parameters<typeof planAllowsFeature>[1]): Promise<void> {
    await this.assertActiveSubscription(companyId);
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    if (!planAllowsFeature(company.subscriptionPlan, feature)) {
      throw new ForbiddenException(
        `This feature requires a paid plan. Upgrade from Settings → Upgrade.`,
      );
    }
  }

  async assertFeatureForShop(shopId: string, feature: Parameters<typeof planAllowsFeature>[1]): Promise<void> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { companyId: true },
    });
    if (!shop?.companyId) {
      throw new NotFoundException('Shop not found or missing company');
    }
    await this.assertFeature(shop.companyId, feature);
  }

  async assertUserLimit(companyId: string): Promise<void> {
    await this.assertActiveSubscription(companyId);
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return;
    const limitsKey = company.subscriptionPlan === SubscriptionPlan.PLUS ? 'PLUS' : company.subscriptionPlan === SubscriptionPlan.PRO ? 'PRO' : 'TRIAL';
    const max = PLAN_LIMITS[limitsKey].maxUsers;
    if (max == null) return;
    const count = await this.prisma.user.count({
      // Removed users are soft-deleted and must not use up the plan quota.
      where: { shop: { companyId }, deletedAt: null },
    });
    if (count >= max) {
      throw new ForbiddenException(`Your plan allows up to ${max} users. Upgrade to add more.`);
    }
  }

  async assertWarehouseLimit(companyId: string): Promise<void> {
    await this.assertActiveSubscription(companyId);
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return;
    const limitsKey = company.subscriptionPlan === SubscriptionPlan.PLUS ? 'PLUS' : company.subscriptionPlan === SubscriptionPlan.PRO ? 'PRO' : 'TRIAL';
    const max = PLAN_LIMITS[limitsKey].maxWarehouses;
    if (max == null) return;
    const count = await this.prisma.shop.count({ where: { companyId } });
    if (count >= max) {
      throw new ForbiddenException(`Your plan allows up to ${max} warehouse(s). Upgrade to add more.`);
    }
  }

  async assertSkuLimit(companyId: string): Promise<void> {
    await this.assertActiveSubscription(companyId);
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return;
    const limitsKey = company.subscriptionPlan === SubscriptionPlan.PLUS ? 'PLUS' : company.subscriptionPlan === SubscriptionPlan.PRO ? 'PRO' : 'TRIAL';
    const max = PLAN_LIMITS[limitsKey].maxSkus;
    if (max == null) return;
    const shopIds = await this.prisma.shop.findMany({
      where: { companyId },
      select: { id: true },
    });
    const count = await this.prisma.productPlant.count({
      where: { shopId: { in: shopIds.map((s) => s.id) }, isActive: true },
    });
    if (count >= max) {
      throw new ForbiddenException(`Your plan allows up to ${max} SKUs. Upgrade to add more products.`);
    }
  }

  async activatePaidPlan(args: {
    companyId: string;
    plan: SubscriptionPlan;
    billingCycle: BillingCycle;
    paymentId: string;
    orderId: string;
    amountPaise: number;
  }) {
    if (args.plan === SubscriptionPlan.TRIAL) {
      throw new BadRequestException('Cannot activate trial via payment');
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.findUnique({
        where: { id: args.companyId },
        select: { subscriptionPlan: true, subscriptionEndsAt: true },
      });
      if (!company) {
        throw new NotFoundException('Company not found');
      }
      if (isDowngrade(company.subscriptionPlan, args.plan)) {
        throw new BadRequestException(
          `Downgrades are not allowed. Current plan: ${company.subscriptionPlan}, requested: ${args.plan}.`,
        );
      }
      await tx.company.update({
        where: { id: args.companyId },
        data: {
          subscriptionPlan: args.plan,
          billingCycle: args.billingCycle,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          trialEndsAt: null,
          subscriptionEndsAt: subscriptionEndDate(
            args.plan,
            args.billingCycle,
            renewalStart(company.subscriptionPlan, args.plan, company.subscriptionEndsAt, now),
          ),
        },
      });
      this.clearWriteBlockCache(args.companyId);
      const { count } = await tx.subscriptionPayment.updateMany({
        where: { razorpayOrderId: args.orderId, consumedAt: null },
        data: {
          companyId: args.companyId,
          razorpayPaymentId: args.paymentId,
          status: 'paid',
          verifiedAt: now,
          consumedAt: now,
        },
      });
      if (count === 0) {
        throw new BadRequestException('Payment already consumed by a concurrent request');
      }
    });
  }

  async startTrial(companyId: string) {
    const now = new Date();
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionPlan: SubscriptionPlan.TRIAL,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        trialStartsAt: now,
        trialEndsAt: trialEndDate(now),
        billingCycle: null,
        subscriptionEndsAt: null,
      },
    });
  }

  async consumeVerifiedPayment(orderId: string, companyId: string) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { razorpayOrderId: orderId },
    });
    if (!payment || payment.status !== 'paid' || payment.consumedAt) {
      throw new BadRequestException('Invalid or already used payment');
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.company.findUnique({
        where: { id: companyId },
        select: { subscriptionPlan: true, subscriptionEndsAt: true },
      });
      await tx.company.update({
        where: { id: companyId },
        data: {
          subscriptionPlan: payment.plan,
          billingCycle: payment.billingCycle,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          trialEndsAt: null,
          subscriptionEndsAt: subscriptionEndDate(
            payment.plan,
            payment.billingCycle,
            renewalStart(current?.subscriptionPlan, payment.plan, current?.subscriptionEndsAt, now),
          ),
        },
      });
      await tx.subscriptionPayment.update({
        where: { id: payment.id },
        data: { companyId, consumedAt: now },
      });
      this.clearWriteBlockCache(companyId);
    });
  }
}

/**
 * Renewing the same plan before it lapses adds the new period after the time
 * already paid for; a new plan (or a lapsed one) starts now.
 */
function renewalStart(
  currentPlan: SubscriptionPlan | null | undefined,
  newPlan: SubscriptionPlan,
  currentEndsAt: Date | null | undefined,
  now: Date,
): Date {
  if (currentPlan === newPlan && currentEndsAt && currentEndsAt > now) return currentEndsAt;
  return now;
}
