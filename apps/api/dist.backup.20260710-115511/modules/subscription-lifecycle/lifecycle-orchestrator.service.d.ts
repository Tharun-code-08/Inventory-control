import { BillingCycle, SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformRevenueService } from '../platform-notifications/platform-revenue.service';
import { PlatformLifecycleMailService } from './platform-lifecycle-mail.service';
import { SubscriptionInvoiceService } from './subscription-invoice.service';
export declare class LifecycleOrchestratorService {
    private readonly prisma;
    private readonly invoices;
    private readonly mail;
    private readonly platformRevenue;
    private readonly logger;
    constructor(prisma: PrismaService, invoices: SubscriptionInvoiceService, mail: PlatformLifecycleMailService, platformRevenue?: PlatformRevenueService | null);
    onTrialStarted(args: {
        companyId: string;
        ownerEmail: string;
        companyName: string;
    }): Promise<void>;
    onSubscriptionActivated(args: {
        companyId: string;
        ownerEmail: string;
        companyName: string;
        plan: SubscriptionPlan;
        billingCycle: BillingCycle;
        amountPaise: number;
        paymentId?: string;
    }): Promise<void>;
    onPaymentFailed(args: {
        companyId: string;
        ownerEmail: string;
        companyName: string;
        paymentId: string;
        failureReason?: string;
        renewalAttempt: number;
    }): Promise<void>;
    onTrialExpired(args: {
        companyId: string;
        ownerEmail: string;
        companyName: string;
    }): Promise<void>;
    resolveOwnerEmail(companyId: string): Promise<{
        email: string;
        companyName: string;
    } | null>;
}
