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
var EngagementTrackerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngagementTrackerService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const plan_config_1 = require("../../common/plans/plan-config");
const prisma_service_1 = require("../../prisma/prisma.service");
const lifecycle_rules_constants_1 = require("./lifecycle-rules.constants");
let EngagementTrackerService = EngagementTrackerService_1 = class EngagementTrackerService {
    prisma;
    logger = new common_1.Logger(EngagementTrackerService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async runDailySnapshot(today = new Date()) {
        const snapshotDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const companies = await this.prisma.company.findMany({
            where: { isActive: true },
            select: {
                id: true,
                createdAt: true,
                subscriptionPlan: true,
                subscriptionStatus: true,
                trialStartsAt: true,
                trialEndsAt: true,
                subscriptionEndsAt: true,
                billingCycle: true,
                paidActivatedAt: true,
            },
        });
        let processed = 0;
        for (const company of companies) {
            const metrics = await this.collectMetrics(company.id);
            const stage = this.computeLifecycleStage(company, metrics, today);
            const trialProgressPct = this.computeTrialProgress(metrics.featuresUsed);
            await this.prisma.companyEngagementSnapshot.upsert({
                where: {
                    companyId_snapshotDate: { companyId: company.id, snapshotDate },
                },
                create: {
                    companyId: company.id,
                    snapshotDate,
                    lifecycleStage: stage,
                    lastLoginAt: metrics.lastLoginAt,
                    loginCount30d: metrics.loginCount30d,
                    featuresUsed: metrics.featuresUsed,
                    productsCount: metrics.productsCount,
                    inventoryTxnCount: metrics.inventoryTxnCount,
                    teamMembersCount: metrics.teamMembersCount,
                    reportsGenerated: metrics.reportsGenerated,
                    trialProgressPct,
                },
                update: {
                    lifecycleStage: stage,
                    lastLoginAt: metrics.lastLoginAt,
                    loginCount30d: metrics.loginCount30d,
                    featuresUsed: metrics.featuresUsed,
                    productsCount: metrics.productsCount,
                    inventoryTxnCount: metrics.inventoryTxnCount,
                    teamMembersCount: metrics.teamMembersCount,
                    reportsGenerated: metrics.reportsGenerated,
                    trialProgressPct,
                },
            });
            processed += 1;
        }
        this.logger.log(`Engagement snapshots updated for ${processed} companies`);
        return { processed };
    }
    computeTrialProgress(featuresUsed) {
        const usedCount = lifecycle_rules_constants_1.TRIAL_FEATURE_CHECKLIST.filter((key) => featuresUsed[key]).length;
        return Math.round((100 * usedCount) / lifecycle_rules_constants_1.TRIAL_FEATURE_CHECKLIST.length);
    }
    computeLifecycleStage(company, metrics, now) {
        const nowMs = now.getTime();
        const daysSinceReg = Math.floor((nowMs - company.createdAt.getTime()) / (24 * 60 * 60 * 1000));
        if (company.subscriptionPlan === client_1.SubscriptionPlan.TRIAL) {
            const trialExpired = company.subscriptionStatus === client_1.SubscriptionStatus.EXPIRED ||
                (company.trialEndsAt != null && company.trialEndsAt.getTime() < nowMs);
            return trialExpired ? client_1.LifecycleStage.TRIAL_EXPIRED : client_1.LifecycleStage.TRIAL;
        }
        if (company.subscriptionStatus === client_1.SubscriptionStatus.EXPIRED ||
            company.subscriptionStatus === client_1.SubscriptionStatus.SUSPENDED ||
            (company.subscriptionEndsAt != null && company.subscriptionEndsAt.getTime() < nowMs)) {
            return client_1.LifecycleStage.EXPIRED;
        }
        if (company.subscriptionEndsAt) {
            const daysUntilRenewal = Math.ceil((company.subscriptionEndsAt.getTime() - nowMs) / (24 * 60 * 60 * 1000));
            const offsets = company.billingCycle === client_1.BillingCycle.YEARLY
                ? lifecycle_rules_constants_1.RENEWAL_OFFSETS.YEARLY
                : lifecycle_rules_constants_1.RENEWAL_OFFSETS.MONTHLY;
            if (offsets.includes(daysUntilRenewal)) {
                return client_1.LifecycleStage.RENEWAL_DUE;
            }
        }
        if (metrics.lastLoginAt) {
            const daysSinceLogin = Math.floor((nowMs - metrics.lastLoginAt.getTime()) / (24 * 60 * 60 * 1000));
            if (daysSinceLogin >= 14)
                return client_1.LifecycleStage.AT_RISK;
        }
        else if (daysSinceReg >= 14) {
            return client_1.LifecycleStage.AT_RISK;
        }
        const featuresUsedCount = Object.values(metrics.featuresUsed).filter(Boolean).length;
        if (metrics.loginCount30d >= 4 || featuresUsedCount >= 3) {
            return client_1.LifecycleStage.ENGAGED;
        }
        if (daysSinceReg <= 7)
            return client_1.LifecycleStage.NEW;
        if (daysSinceReg <= 60)
            return client_1.LifecycleStage.ACTIVE;
        return client_1.LifecycleStage.ACTIVE;
    }
    async collectMetrics(companyId) {
        const shopIds = (await this.prisma.shop.findMany({ where: { companyId }, select: { id: true } })).map((s) => s.id);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [users, productsCount, grCount, giCount, invitations, lastLoginAgg] = await Promise.all([
            this.prisma.user.count({ where: { shopId: { in: shopIds }, deletedAt: null } }),
            this.prisma.productPlant.count({
                where: { shopId: { in: shopIds }, isActive: true },
            }),
            this.prisma.goodsReceiptHeader.count({
                where: { shopId: { in: shopIds }, status: 'POSTED' },
            }),
            this.prisma.goodsIssueHeader.count({
                where: { shopId: { in: shopIds }, status: 'POSTED' },
            }),
            this.prisma.userInvitation.count({ where: { shopId: { in: shopIds } } }),
            this.prisma.user.aggregate({
                where: { shopId: { in: shopIds }, deletedAt: null, lastLoginAt: { not: null } },
                _max: { lastLoginAt: true },
                _count: {
                    _all: true,
                },
            }),
        ]);
        const loginCount30d = await this.prisma.user.count({
            where: {
                shopId: { in: shopIds },
                deletedAt: null,
                lastLoginAt: { gte: thirtyDaysAgo },
            },
        });
        const reportsGenerated = await this.prisma.auditLog.count({
            where: {
                action: 'EXPORT_AUDIT',
                user: { shopId: { in: shopIds } },
                createdAt: { gte: thirtyDaysAgo },
            },
        });
        const featuresUsed = {
            login: loginCount30d > 0,
            product_created: productsCount > 0,
            gr_posted: grCount > 0,
            gi_posted: giCount > 0,
            report_viewed: reportsGenerated > 0,
            user_invited: invitations > 0,
            dashboard_viewed: loginCount30d > 0,
        };
        return {
            lastLoginAt: lastLoginAgg._max.lastLoginAt,
            loginCount30d,
            featuresUsed,
            productsCount,
            inventoryTxnCount: grCount + giCount,
            teamMembersCount: users,
            reportsGenerated,
        };
    }
    eligibleCampaignKeys(company, today, snapshot) {
        const keys = [];
        const dayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        for (const campaign of lifecycle_rules_constants_1.LIFECYCLE_CAMPAIGNS) {
            if (campaign.key === 'platform_subscription_welcome' || campaign.key === 'platform_trial_welcome') {
                continue;
            }
            if (campaign.paidOnly && company.subscriptionPlan === client_1.SubscriptionPlan.TRIAL)
                continue;
            if (campaign.trialOnly && company.subscriptionPlan !== client_1.SubscriptionPlan.TRIAL)
                continue;
            if (campaign.monthlyOnFirst && today.getUTCDate() !== 1)
                continue;
            if (campaign.kind === 'paid_engagement' && campaign.dayOffset != null && company.paidActivatedAt) {
                const daysSince = this.daysBetween(company.paidActivatedAt, dayStart);
                if (daysSince === campaign.dayOffset)
                    keys.push(campaign.key);
            }
            if (campaign.kind === 'trial_nurture' && campaign.dayOffset != null && company.trialStartsAt) {
                const daysSince = this.daysBetween(company.trialStartsAt, dayStart);
                if (daysSince === campaign.dayOffset && daysSince <= (0, plan_config_1.getTrialNurtureDays)()) {
                    keys.push(campaign.key);
                }
            }
            if (campaign.kind === 'renewal' && campaign.daysBeforeExpiry != null && company.subscriptionEndsAt) {
                const daysUntil = this.daysBetween(dayStart, company.subscriptionEndsAt);
                const prefix = company.billingCycle === client_1.BillingCycle.YEARLY ? 'renewal_yearly_' : 'renewal_monthly_';
                if (campaign.key === `${prefix}${campaign.daysBeforeExpiry}` && daysUntil === campaign.daysBeforeExpiry) {
                    keys.push(campaign.key);
                }
            }
            if (campaign.kind === 'trial_expiry' && campaign.daysBeforeExpiry != null && company.trialEndsAt) {
                const daysUntil = this.daysBetween(dayStart, company.trialEndsAt);
                if (daysUntil === campaign.daysBeforeExpiry)
                    keys.push(campaign.key);
            }
            if (campaign.kind === 'trial_expired' && campaign.daysAfterTrialExpiry != null && company.trialEndsAt) {
                const trialEndDay = new Date(company.trialEndsAt);
                trialEndDay.setUTCHours(0, 0, 0, 0);
                if (dayStart.getTime() < trialEndDay.getTime())
                    continue;
                const daysAfter = this.daysBetween(trialEndDay, dayStart);
                if (daysAfter === campaign.daysAfterTrialExpiry)
                    keys.push(campaign.key);
            }
            if (campaign.kind === 'trial_inactive' && snapshot?.lastLoginAt && company.subscriptionPlan === client_1.SubscriptionPlan.TRIAL) {
                const daysSinceLogin = this.daysBetween(snapshot.lastLoginAt, dayStart);
                if (daysSinceLogin >= 7)
                    keys.push(campaign.key);
            }
            if (campaign.kind === 'trial_edu' && company.subscriptionPlan === client_1.SubscriptionPlan.TRIAL && snapshot) {
                const used = snapshot.featuresUsed;
                if (campaign.key === 'trial_edu_inventory' && !used.product_created)
                    keys.push(campaign.key);
                if (campaign.key === 'trial_edu_purchase' && !used.gr_posted)
                    keys.push(campaign.key);
                if (campaign.key === 'trial_edu_reports' && !used.report_viewed)
                    keys.push(campaign.key);
            }
        }
        return keys;
    }
    daysBetween(from, to) {
        const a = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
        const b = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
        return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
    }
    async expireTrialsPastEnd(today = new Date()) {
        const expired = await this.prisma.company.findMany({
            where: {
                subscriptionPlan: client_1.SubscriptionPlan.TRIAL,
                subscriptionStatus: client_1.SubscriptionStatus.ACTIVE,
                trialEndsAt: { lt: today },
            },
            select: { id: true },
        });
        if (expired.length === 0)
            return [];
        await this.prisma.company.updateMany({
            where: { id: { in: expired.map((c) => c.id) } },
            data: { subscriptionStatus: client_1.SubscriptionStatus.EXPIRED },
        });
        return expired.map((c) => c.id);
    }
};
exports.EngagementTrackerService = EngagementTrackerService;
exports.EngagementTrackerService = EngagementTrackerService = EngagementTrackerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EngagementTrackerService);
//# sourceMappingURL=engagement-tracker.service.js.map