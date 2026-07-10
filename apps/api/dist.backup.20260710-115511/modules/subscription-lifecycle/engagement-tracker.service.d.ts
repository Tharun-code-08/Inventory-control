import { BillingCycle, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class EngagementTrackerService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    runDailySnapshot(today?: Date): Promise<{
        processed: number;
    }>;
    private computeTrialProgress;
    private computeLifecycleStage;
    collectMetrics(companyId: string): Promise<{
        lastLoginAt: Date | null;
        loginCount30d: number;
        featuresUsed: Record<"login" | "product_created" | "gr_posted" | "gi_posted" | "report_viewed" | "user_invited" | "dashboard_viewed", boolean>;
        productsCount: number;
        inventoryTxnCount: number;
        teamMembersCount: number;
        reportsGenerated: number;
    }>;
    eligibleCampaignKeys(company: {
        subscriptionPlan: SubscriptionPlan;
        subscriptionStatus: SubscriptionStatus;
        trialStartsAt: Date | null;
        trialEndsAt: Date | null;
        subscriptionEndsAt: Date | null;
        billingCycle: BillingCycle | null;
        paidActivatedAt: Date | null;
        createdAt: Date;
    }, today: Date, snapshot?: {
        lastLoginAt: Date | null;
        featuresUsed: Record<string, boolean>;
    }): string[];
    private daysBetween;
    expireTrialsPastEnd(today?: Date): Promise<string[]>;
}
