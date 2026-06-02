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

  async assertActiveSubscription(companyId: string): Promise<void> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
    const snap = this.toSnapshot(company);
    if (snap.isTrialExpired) {
      throw new ForbiddenException(
        `Your ${getTrialDays()}-day trial has ended. Upgrade to Pro or Plus to continue using Retail IMS.`,
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
      where: { shop: { companyId } },
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
        select: { subscriptionPlan: true },
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
          subscriptionEndsAt: subscriptionEndDate(args.plan, args.billingCycle, now),
        },
      });
      await tx.subscriptionPayment.updateMany({
        where: { razorpayOrderId: args.orderId },
        data: {
          companyId: args.companyId,
          razorpayPaymentId: args.paymentId,
          status: 'paid',
          verifiedAt: now,
          consumedAt: now,
        },
      });
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
      await tx.company.update({
        where: { id: companyId },
        data: {
          subscriptionPlan: payment.plan,
          billingCycle: payment.billingCycle,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          trialEndsAt: null,
          subscriptionEndsAt: subscriptionEndDate(payment.plan, payment.billingCycle, now),
        },
      });
      await tx.subscriptionPayment.update({
        where: { id: payment.id },
        data: { companyId, consumedAt: now },
      });
    });
  }
}
