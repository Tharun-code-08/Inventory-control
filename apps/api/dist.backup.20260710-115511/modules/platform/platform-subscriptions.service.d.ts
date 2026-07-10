import { PrismaService } from '../../prisma/prisma.service';
export declare class PlatformSubscriptionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getDashboard(): Promise<{
        kpis: {
            totalTrials: number;
            activeTrials: number;
            expiringTrials: number;
            paidSubscribers: number;
            conversions30d: number;
            conversionRate30d: number;
            mrrInr: number;
            arrInr: number;
            churnExpired: number;
        };
        upcomingRenewals: {
            companyId: string;
            companyName: string;
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
            renewsAt: string | null;
        }[];
        failedPayments: {
            id: string;
            companyName: string;
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
            amountPaise: number;
            failureReason: string | null;
            renewalAttempt: number;
            createdAt: string;
        }[];
        emailAnalytics: {
            templateId: string;
            sent: number;
            clicks: number;
            opens: number;
        }[];
        lifecycleStages: {
            companyName: string;
            stage: import(".prisma/client").$Enums.LifecycleStage;
            trialProgressPct: number;
            snapshotDate: string;
        }[];
        recentSubscribers: {
            id: string;
            companyName: string;
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
            status: import(".prisma/client").$Enums.SubscriptionStatus;
            createdAt: string;
        }[];
    }>;
}
