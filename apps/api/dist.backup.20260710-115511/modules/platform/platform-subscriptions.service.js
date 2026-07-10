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
exports.PlatformSubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const plan_config_1 = require("../../common/plans/plan-config");
const prisma_service_1 = require("../../prisma/prisma.service");
function mrrForCompany(plan, cycle) {
    if (plan === client_1.SubscriptionPlan.TRIAL)
        return 0;
    const key = plan === client_1.SubscriptionPlan.PLUS ? 'plus' : 'pro';
    const pricing = plan_config_1.PLAN_PRICING[key];
    if (cycle === client_1.BillingCycle.YEARLY) {
        return pricing.yearly.displayPerMonth;
    }
    return pricing.monthly.display;
}
let PlatformSubscriptionsService = class PlatformSubscriptionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboard() {
        const now = new Date();
        const thirtyDays = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const companies = await this.prisma.company.findMany({
            where: { isActive: true },
            select: {
                id: true,
                companyName: true,
                subscriptionPlan: true,
                subscriptionStatus: true,
                trialStartsAt: true,
                trialEndsAt: true,
                subscriptionEndsAt: true,
                billingCycle: true,
                createdAt: true,
                paidActivatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
        });
        const trials = companies.filter((c) => c.subscriptionPlan === client_1.SubscriptionPlan.TRIAL);
        const activeTrials = trials.filter((c) => c.subscriptionStatus === client_1.SubscriptionStatus.ACTIVE);
        const expiringTrials = trials.filter((c) => c.trialEndsAt &&
            c.trialEndsAt.getTime() > now.getTime() &&
            c.trialEndsAt.getTime() <= now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const paid = companies.filter((c) => c.subscriptionPlan !== client_1.SubscriptionPlan.TRIAL &&
            c.subscriptionStatus === client_1.SubscriptionStatus.ACTIVE);
        const trialStarts30d = trials.filter((c) => c.trialStartsAt && c.trialStartsAt >= thirtyDays).length;
        const conversions = await this.prisma.subscriptionPayment.count({
            where: {
                status: 'paid',
                consumedAt: { gte: thirtyDays },
                plan: { in: [client_1.SubscriptionPlan.PRO, client_1.SubscriptionPlan.PLUS] },
            },
        });
        const conversionRate = trialStarts30d > 0 ? Math.round((100 * conversions) / trialStarts30d) : 0;
        const mrr = paid.reduce((sum, c) => sum + mrrForCompany(c.subscriptionPlan, c.billingCycle), 0);
        const upcomingRenewals = paid
            .filter((c) => c.subscriptionEndsAt &&
            c.subscriptionEndsAt.getTime() > now.getTime() &&
            c.subscriptionEndsAt.getTime() <= now.getTime() + 30 * 24 * 60 * 60 * 1000)
            .map((c) => ({
            companyId: c.id,
            companyName: c.companyName,
            plan: c.subscriptionPlan,
            renewsAt: c.subscriptionEndsAt?.toISOString() ?? null,
        }));
        const failedPayments = await this.prisma.subscriptionPayment.findMany({
            where: { status: 'failed' },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { company: { select: { companyName: true } } },
        });
        const emailStats = await this.prisma.emailDeliveryLog.groupBy({
            by: ['templateId'],
            where: { templateId: { startsWith: 'platform_' } },
            _count: { _all: true },
            _sum: { clickCount: true, openCount: true },
        });
        const recentSnapshots = await this.prisma.companyEngagementSnapshot.findMany({
            orderBy: { snapshotDate: 'desc' },
            take: 50,
            include: { company: { select: { companyName: true } } },
        });
        return {
            kpis: {
                totalTrials: trials.length,
                activeTrials: activeTrials.length,
                expiringTrials: expiringTrials.length,
                paidSubscribers: paid.length,
                conversions30d: conversions,
                conversionRate30d: conversionRate,
                mrrInr: mrr,
                arrInr: mrr * 12,
                churnExpired: companies.filter((c) => c.subscriptionStatus === client_1.SubscriptionStatus.EXPIRED).length,
            },
            upcomingRenewals,
            failedPayments: failedPayments.map((p) => ({
                id: p.id,
                companyName: p.company?.companyName ?? '—',
                plan: p.plan,
                amountPaise: p.amountPaise,
                failureReason: p.failureReason,
                renewalAttempt: p.renewalAttempt,
                createdAt: p.createdAt.toISOString(),
            })),
            emailAnalytics: emailStats.map((row) => ({
                templateId: row.templateId,
                sent: row._count._all,
                clicks: row._sum.clickCount ?? 0,
                opens: row._sum.openCount ?? 0,
            })),
            lifecycleStages: recentSnapshots.map((s) => ({
                companyName: s.company.companyName,
                stage: s.lifecycleStage,
                trialProgressPct: s.trialProgressPct,
                snapshotDate: s.snapshotDate.toISOString().slice(0, 10),
            })),
            recentSubscribers: companies.slice(0, 20).map((c) => ({
                id: c.id,
                companyName: c.companyName,
                plan: c.subscriptionPlan,
                status: c.subscriptionStatus,
                createdAt: c.createdAt.toISOString(),
            })),
        };
    }
};
exports.PlatformSubscriptionsService = PlatformSubscriptionsService;
exports.PlatformSubscriptionsService = PlatformSubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlatformSubscriptionsService);
//# sourceMappingURL=platform-subscriptions.service.js.map