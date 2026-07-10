import type { RequestUser } from '../../common/types/request-user';
import { SubscriptionInvoiceService } from '../subscription-lifecycle/subscription-invoice.service';
import { PlatformAuditService } from './platform-audit.service';
import { PlatformSubscriptionsService } from './platform-subscriptions.service';
export declare class PlatformSubscriptionsController {
    private readonly platform;
    private readonly invoices;
    private readonly platformAudit;
    constructor(platform: PlatformSubscriptionsService, invoices: SubscriptionInvoiceService, platformAudit: PlatformAuditService);
    dashboard(user: RequestUser): Promise<{
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
    backfillInvoices(user: RequestUser): Promise<{
        companies: number;
        invoices: number;
    }>;
}
