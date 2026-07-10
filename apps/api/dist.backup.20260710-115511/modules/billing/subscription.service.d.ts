import { BillingCycle, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { planAllowsFeature } from '../../common/plans/plan-config';
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
export declare class SubscriptionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    resolveCompanyIdForUser(user: RequestUser): Promise<string | null>;
    getSnapshotForUser(user: RequestUser): Promise<SubscriptionSnapshot | null>;
    toSnapshot(company: {
        subscriptionPlan: SubscriptionPlan;
        billingCycle: BillingCycle | null;
        subscriptionStatus: SubscriptionStatus;
        trialStartsAt: Date | null;
        trialEndsAt: Date | null;
        subscriptionEndsAt: Date | null;
    }): SubscriptionSnapshot;
    assertActiveSubscription(companyId: string): Promise<void>;
    assertFeature(companyId: string, feature: Parameters<typeof planAllowsFeature>[1]): Promise<void>;
    assertFeatureForShop(shopId: string, feature: Parameters<typeof planAllowsFeature>[1]): Promise<void>;
    assertUserLimit(companyId: string): Promise<void>;
    assertWarehouseLimit(companyId: string): Promise<void>;
    assertSkuLimit(companyId: string): Promise<void>;
    activatePaidPlan(args: {
        companyId: string;
        plan: SubscriptionPlan;
        billingCycle: BillingCycle;
        paymentId: string;
        orderId: string;
        amountPaise: number;
    }): Promise<void>;
    startTrial(companyId: string): Promise<void>;
    consumeVerifiedPayment(orderId: string, companyId: string): Promise<void>;
}
