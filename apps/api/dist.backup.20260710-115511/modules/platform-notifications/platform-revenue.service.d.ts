import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformNotificationService } from './platform-notification.service';
export declare class PlatformRevenueService {
    private readonly prisma;
    private readonly notifications;
    private readonly config;
    constructor(prisma: PrismaService, notifications: PlatformNotificationService, config: ConfigService);
    onTrialStarted(args: {
        companyId: string;
        companyName: string;
    }): Promise<{
        skipped: "duplicate";
        notificationId?: undefined;
    } | {
        notificationId: string;
        skipped?: undefined;
    }>;
    onTrialConverted(args: {
        companyId: string;
        companyName: string;
        plan: SubscriptionPlan;
        amountPaise: number;
    }): Promise<{
        skipped: "duplicate";
        notificationId?: undefined;
    } | {
        notificationId: string;
        skipped?: undefined;
    }>;
    onSubscriptionRenewed(args: {
        companyId: string;
        companyName: string;
        plan: SubscriptionPlan;
        amountPaise: number;
        paymentId: string;
    }): Promise<{
        skipped: "duplicate";
        notificationId?: undefined;
    } | {
        notificationId: string;
        skipped?: undefined;
    }>;
    onFailedRenewal(args: {
        companyId: string;
        companyName: string;
        paymentId: string;
        failureReason?: string | null;
        renewalAttempt: number;
    }): Promise<{
        skipped: "duplicate";
        notificationId?: undefined;
    } | {
        notificationId: string;
        skipped?: undefined;
    }>;
    onSubscriptionCancelled(args: {
        companyId: string;
        companyName: string;
    }): Promise<{
        skipped: "duplicate";
        notificationId?: undefined;
    } | {
        notificationId: string;
        skipped?: undefined;
    }>;
    checkRevenueMilestones(): Promise<{
        mrr: number;
        dispatched: number;
    }>;
}
