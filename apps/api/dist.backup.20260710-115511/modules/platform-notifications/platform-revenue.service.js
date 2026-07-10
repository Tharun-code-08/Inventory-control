"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformRevenueService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const plan_config_1 = require("../../common/plans/plan-config");
const prisma_service_1 = require("../../prisma/prisma.service");
const platform_notification_constants_1 = require("./platform-notification.constants");
const platform_notification_service_1 = require("./platform-notification.service");
function mrrForCompany(plan, cycle) {
    if (plan === client_1.SubscriptionPlan.TRIAL)
        return 0;
    const key = plan === client_1.SubscriptionPlan.PLUS ? 'plus' : 'pro';
    const pricing = plan_config_1.PLAN_PRICING[key];
    return cycle === client_1.BillingCycle.YEARLY ? pricing.yearly.displayPerMonth : pricing.monthly.display;
}
let PlatformRevenueService = class PlatformRevenueService {
    prisma;
    notifications;
    config;
    constructor(prisma, notifications, config) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.config = config;
    }
    async onTrialStarted(args) {
        return this.notifications.dispatch({
            category: client_1.PlatformNotificationCategory.REVENUE,
            severity: client_1.PlatformNotificationSeverity.INFO,
            notificationKey: platform_notification_constants_1.PLATFORM_NOTIFICATION_KEYS.TRIAL_STARTED,
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
    async onTrialConverted(args) {
        const amount = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(args.amountPaise / 100);
        return this.notifications.dispatch({
            category: client_1.PlatformNotificationCategory.REVENUE,
            severity: client_1.PlatformNotificationSeverity.HIGH,
            notificationKey: platform_notification_constants_1.PLATFORM_NOTIFICATION_KEYS.TRIAL_CONVERTED,
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
    async onSubscriptionRenewed(args) {
        const amount = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(args.amountPaise / 100);
        return this.notifications.dispatch({
            category: client_1.PlatformNotificationCategory.REVENUE,
            severity: client_1.PlatformNotificationSeverity.INFO,
            notificationKey: platform_notification_constants_1.PLATFORM_NOTIFICATION_KEYS.SUBSCRIPTION_RENEWED,
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
    async onFailedRenewal(args) {
        return this.notifications.dispatch({
            category: client_1.PlatformNotificationCategory.REVENUE,
            severity: client_1.PlatformNotificationSeverity.CRITICAL,
            notificationKey: platform_notification_constants_1.PLATFORM_NOTIFICATION_KEYS.FAILED_RENEWAL,
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
    async onSubscriptionCancelled(args) {
        return this.notifications.dispatch({
            category: client_1.PlatformNotificationCategory.REVENUE,
            severity: client_1.PlatformNotificationSeverity.HIGH,
            notificationKey: platform_notification_constants_1.PLATFORM_NOTIFICATION_KEYS.SUBSCRIPTION_CANCELLED,
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
        const milestonesRaw = this.config.get('PLATFORM_MRR_MILESTONES_INR') ??
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
                subscriptionPlan: { in: [client_1.SubscriptionPlan.PLUS, client_1.SubscriptionPlan.PRO] },
                subscriptionStatus: client_1.SubscriptionStatus.ACTIVE,
            },
            select: { subscriptionPlan: true, billingCycle: true },
        });
        const mrr = paid.reduce((sum, c) => sum + mrrForCompany(c.subscriptionPlan, c.billingCycle), 0);
        let dispatched = 0;
        for (const milestone of milestones) {
            if (mrr < milestone)
                continue;
            const result = await this.notifications.dispatch({
                category: client_1.PlatformNotificationCategory.REVENUE,
                severity: client_1.PlatformNotificationSeverity.HIGH,
                notificationKey: `${platform_notification_constants_1.PLATFORM_NOTIFICATION_KEYS.REVENUE_MILESTONE}:${milestone}`,
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
            if (!('skipped' in result))
                dispatched += 1;
        }
        return { mrr, dispatched };
    }
};
exports.PlatformRevenueService = PlatformRevenueService;
exports.PlatformRevenueService = PlatformRevenueService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        platform_notification_service_1.PlatformNotificationService,
        config_1.ConfigService])
], PlatformRevenueService);
//# sourceMappingURL=platform-revenue.service.js.map