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
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const plan_config_1 = require("../../common/plans/plan-config");
const prisma_service_1 = require("../../prisma/prisma.service");
let SubscriptionService = class SubscriptionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async resolveCompanyIdForUser(user) {
        if (!user.shopId)
            return null;
        const shop = await this.prisma.shop.findUnique({
            where: { id: user.shopId },
            select: { companyId: true },
        });
        return shop?.companyId ?? null;
    }
    async getSnapshotForUser(user) {
        const companyId = await this.resolveCompanyIdForUser(user);
        if (!companyId)
            return null;
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company)
            return null;
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
    toSnapshot(company) {
        const now = Date.now();
        const trialEnds = company.trialEndsAt?.getTime() ?? null;
        const isTrial = company.subscriptionPlan === client_1.SubscriptionPlan.TRIAL;
        const isTrialExpired = isTrial && company.subscriptionStatus === client_1.SubscriptionStatus.EXPIRED
            ? true
            : isTrial && trialEnds != null
                ? trialEnds < now
                : false;
        const limitsKey = company.subscriptionPlan === client_1.SubscriptionPlan.PLUS ? 'PLUS' : company.subscriptionPlan === client_1.SubscriptionPlan.PRO ? 'PRO' : 'TRIAL';
        const limits = plan_config_1.PLAN_LIMITS[limitsKey];
        return {
            plan: company.subscriptionPlan,
            billingCycle: company.billingCycle,
            status: company.subscriptionStatus,
            trialStartsAt: company.trialStartsAt?.toISOString() ?? null,
            trialEndsAt: company.trialEndsAt?.toISOString() ?? null,
            subscriptionEndsAt: company.subscriptionEndsAt?.toISOString() ?? null,
            daysLeftInTrial: isTrial && trialEnds != null
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
                reports: (0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, 'reports'),
                purchaseOrders: (0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, 'purchase_orders'),
                rfqs: (0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, 'rfqs'),
                contracts: (0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, 'contracts'),
                salesOrders: (0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, 'sales_orders'),
                salesQuotations: (0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, 'sales_quotations'),
                invoices: (0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, 'invoices'),
                payments: (0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, 'payments'),
                supplierPortal: (0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, 'supplier_portal'),
                integrations: (0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, 'integrations'),
                api: (0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, 'api'),
                vendorPortal: (0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, 'vendor_portal'),
                auditRbac: (0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, 'audit_rbac'),
                backups: (0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, 'backups'),
            },
        };
    }
    async assertActiveSubscription(companyId) {
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        const snap = this.toSnapshot(company);
        if (snap.isTrialExpired) {
            throw new common_1.ForbiddenException(`Your ${(0, plan_config_1.getTrialDays)()}-day trial has ended. Upgrade to Pro or Plus to continue using SoftdigitIMS.`);
        }
        if (company.subscriptionStatus === client_1.SubscriptionStatus.EXPIRED &&
            company.subscriptionPlan !== client_1.SubscriptionPlan.TRIAL) {
            throw new common_1.ForbiddenException('Your subscription has expired. Please renew to continue.');
        }
    }
    async assertFeature(companyId, feature) {
        await this.assertActiveSubscription(companyId);
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        if (!(0, plan_config_1.planAllowsFeature)(company.subscriptionPlan, feature)) {
            throw new common_1.ForbiddenException(`This feature requires a paid plan. Upgrade from Settings → Upgrade.`);
        }
    }
    async assertFeatureForShop(shopId, feature) {
        const shop = await this.prisma.shop.findUnique({
            where: { id: shopId },
            select: { companyId: true },
        });
        if (!shop?.companyId) {
            throw new common_1.NotFoundException('Shop not found or missing company');
        }
        await this.assertFeature(shop.companyId, feature);
    }
    async assertUserLimit(companyId) {
        await this.assertActiveSubscription(companyId);
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company)
            return;
        const limitsKey = company.subscriptionPlan === client_1.SubscriptionPlan.PLUS ? 'PLUS' : company.subscriptionPlan === client_1.SubscriptionPlan.PRO ? 'PRO' : 'TRIAL';
        const max = plan_config_1.PLAN_LIMITS[limitsKey].maxUsers;
        if (max == null)
            return;
        const count = await this.prisma.user.count({
            where: { shop: { companyId } },
        });
        if (count >= max) {
            throw new common_1.ForbiddenException(`Your plan allows up to ${max} users. Upgrade to add more.`);
        }
    }
    async assertWarehouseLimit(companyId) {
        await this.assertActiveSubscription(companyId);
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company)
            return;
        const limitsKey = company.subscriptionPlan === client_1.SubscriptionPlan.PLUS ? 'PLUS' : company.subscriptionPlan === client_1.SubscriptionPlan.PRO ? 'PRO' : 'TRIAL';
        const max = plan_config_1.PLAN_LIMITS[limitsKey].maxWarehouses;
        if (max == null)
            return;
        const count = await this.prisma.shop.count({ where: { companyId } });
        if (count >= max) {
            throw new common_1.ForbiddenException(`Your plan allows up to ${max} warehouse(s). Upgrade to add more.`);
        }
    }
    async assertSkuLimit(companyId) {
        await this.assertActiveSubscription(companyId);
        const company = await this.prisma.company.findUnique({ where: { id: companyId } });
        if (!company)
            return;
        const limitsKey = company.subscriptionPlan === client_1.SubscriptionPlan.PLUS ? 'PLUS' : company.subscriptionPlan === client_1.SubscriptionPlan.PRO ? 'PRO' : 'TRIAL';
        const max = plan_config_1.PLAN_LIMITS[limitsKey].maxSkus;
        if (max == null)
            return;
        const shopIds = await this.prisma.shop.findMany({
            where: { companyId },
            select: { id: true },
        });
        const count = await this.prisma.productPlant.count({
            where: { shopId: { in: shopIds.map((s) => s.id) }, isActive: true },
        });
        if (count >= max) {
            throw new common_1.ForbiddenException(`Your plan allows up to ${max} SKUs. Upgrade to add more products.`);
        }
    }
    async activatePaidPlan(args) {
        if (args.plan === client_1.SubscriptionPlan.TRIAL) {
            throw new common_1.BadRequestException('Cannot activate trial via payment');
        }
        const now = new Date();
        await this.prisma.$transaction(async (tx) => {
            const company = await tx.company.findUnique({
                where: { id: args.companyId },
                select: { subscriptionPlan: true },
            });
            if (!company) {
                throw new common_1.NotFoundException('Company not found');
            }
            if ((0, plan_config_1.isDowngrade)(company.subscriptionPlan, args.plan)) {
                throw new common_1.BadRequestException(`Downgrades are not allowed. Current plan: ${company.subscriptionPlan}, requested: ${args.plan}.`);
            }
            await tx.company.update({
                where: { id: args.companyId },
                data: {
                    subscriptionPlan: args.plan,
                    billingCycle: args.billingCycle,
                    subscriptionStatus: client_1.SubscriptionStatus.ACTIVE,
                    trialEndsAt: null,
                    subscriptionEndsAt: (0, plan_config_1.subscriptionEndDate)(args.plan, args.billingCycle, now),
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
    async startTrial(companyId) {
        const now = new Date();
        await this.prisma.company.update({
            where: { id: companyId },
            data: {
                subscriptionPlan: client_1.SubscriptionPlan.TRIAL,
                subscriptionStatus: client_1.SubscriptionStatus.ACTIVE,
                trialStartsAt: now,
                trialEndsAt: (0, plan_config_1.trialEndDate)(now),
                billingCycle: null,
                subscriptionEndsAt: null,
            },
        });
    }
    async consumeVerifiedPayment(orderId, companyId) {
        const payment = await this.prisma.subscriptionPayment.findUnique({
            where: { razorpayOrderId: orderId },
        });
        if (!payment || payment.status !== 'paid' || payment.consumedAt) {
            throw new common_1.BadRequestException('Invalid or already used payment');
        }
        const now = new Date();
        await this.prisma.$transaction(async (tx) => {
            await tx.company.update({
                where: { id: companyId },
                data: {
                    subscriptionPlan: payment.plan,
                    billingCycle: payment.billingCycle,
                    subscriptionStatus: client_1.SubscriptionStatus.ACTIVE,
                    trialEndsAt: null,
                    subscriptionEndsAt: (0, plan_config_1.subscriptionEndDate)(payment.plan, payment.billingCycle, now),
                },
            });
            await tx.subscriptionPayment.update({
                where: { id: payment.id },
                data: { companyId, consumedAt: now },
            });
        });
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionService);
//# sourceMappingURL=subscription.service.js.map