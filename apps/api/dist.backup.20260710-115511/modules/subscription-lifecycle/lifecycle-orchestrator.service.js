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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LifecycleOrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LifecycleOrchestratorService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const subscription_invoice_builder_1 = require("../../common/pdf/builders/subscription-invoice.builder");
const html_to_pdf_service_1 = require("../../common/pdf/html-to-pdf.service");
const plan_config_1 = require("../../common/plans/plan-config");
const prisma_service_1 = require("../../prisma/prisma.service");
const platform_lifecycle_mail_service_1 = require("./platform-lifecycle-mail.service");
const subscription_invoice_service_1 = require("./subscription-invoice.service");
function planLabel(plan) {
    if (plan === 'PLUS')
        return 'Plus';
    if (plan === 'PRO')
        return 'Pro';
    return 'Trial';
}
function cycleLabel(cycle) {
    return cycle === 'YEARLY' ? 'Yearly' : 'Monthly';
}
function formatInr(paise) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
}
let LifecycleOrchestratorService = LifecycleOrchestratorService_1 = class LifecycleOrchestratorService {
    prisma;
    invoices;
    mail;
    platformRevenue;
    logger = new common_1.Logger(LifecycleOrchestratorService_1.name);
    constructor(prisma, invoices, mail, platformRevenue = null) {
        this.prisma = prisma;
        this.invoices = invoices;
        this.mail = mail;
        this.platformRevenue = platformRevenue;
    }
    async onTrialStarted(args) {
        const company = await this.prisma.company.findUnique({
            where: { id: args.companyId },
            select: { trialEndsAt: true, platformMarketingOptOut: true },
        });
        if (!company)
            return;
        const trialEndsAt = company.trialEndsAt?.toLocaleDateString('en-IN') ?? '';
        await this.mail.sendCampaignEmail({
            companyId: args.companyId,
            companyName: args.companyName,
            recipient: args.ownerEmail,
            campaignKey: 'platform_trial_welcome',
            marketingOptOut: company.platformMarketingOptOut,
            context: { trialEndsAt },
        });
        await this.platformRevenue
            ?.onTrialStarted({ companyId: args.companyId, companyName: args.companyName })
            .catch(() => undefined);
        this.logger.log(`Trial welcome queued for company ${args.companyId}`);
    }
    async onSubscriptionActivated(args) {
        const company = await this.prisma.company.findUnique({
            where: { id: args.companyId },
            select: {
                address: true,
                companyName: true,
                platformMarketingOptOut: true,
                paidActivatedAt: true,
                subscriptionPlan: true,
            },
        });
        if (!company)
            return;
        const isFirstPaid = !company.paidActivatedAt;
        await this.prisma.company.update({
            where: { id: args.companyId },
            data: { paidActivatedAt: new Date() },
        });
        const invoice = await this.invoices.createInvoice({
            companyId: args.companyId,
            plan: args.plan,
            billingCycle: args.billingCycle,
            amountPaise: args.amountPaise,
            paymentId: args.paymentId,
            billingAddress: {
                companyName: company.companyName,
                address: company.address ?? undefined,
            },
        });
        const fullInvoice = await this.invoices.getForCompany(args.companyId, invoice.id);
        const html = (0, subscription_invoice_builder_1.buildSubscriptionInvoicePdfHtml)(fullInvoice);
        const pdfBuffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)(html);
        await this.mail.sendSubscriptionWelcome({
            companyId: args.companyId,
            companyName: args.companyName,
            recipient: args.ownerEmail,
            planName: planLabel(args.plan),
            billingCycle: cycleLabel(args.billingCycle),
            amountDisplay: formatInr(args.amountPaise),
            invoiceNumber: invoice.invoiceNumber,
            invoicePdf: pdfBuffer,
        });
        if (isFirstPaid || company.subscriptionPlan === client_1.SubscriptionPlan.TRIAL) {
            await this.platformRevenue
                ?.onTrialConverted({
                companyId: args.companyId,
                companyName: args.companyName,
                plan: args.plan,
                amountPaise: args.amountPaise,
            })
                .catch(() => undefined);
        }
        else if (args.paymentId) {
            await this.platformRevenue
                ?.onSubscriptionRenewed({
                companyId: args.companyId,
                companyName: args.companyName,
                plan: args.plan,
                amountPaise: args.amountPaise,
                paymentId: args.paymentId,
            })
                .catch(() => undefined);
        }
        this.logger.log(`Subscription activated lifecycle for company ${args.companyId}`);
    }
    async onPaymentFailed(args) {
        await this.prisma.subscriptionPayment.update({
            where: { id: args.paymentId },
            data: {
                status: 'failed',
                failureReason: args.failureReason,
                renewalAttempt: args.renewalAttempt,
            },
        });
        const campaignKeys = ['dunning_immediate', 'dunning_1d', 'dunning_3d', 'dunning_7d', 'dunning_14d'];
        const key = campaignKeys[Math.min(args.renewalAttempt, campaignKeys.length - 1)];
        if (args.renewalAttempt >= 3) {
            await this.prisma.company.update({
                where: { id: args.companyId },
                data: { subscriptionStatus: args.renewalAttempt >= 4 ? 'EXPIRED' : 'SUSPENDED' },
            });
        }
        await this.mail.sendCampaignEmail({
            companyId: args.companyId,
            companyName: args.companyName,
            recipient: args.ownerEmail,
            campaignKey: key,
        });
        await this.platformRevenue
            ?.onFailedRenewal({
            companyId: args.companyId,
            companyName: args.companyName,
            paymentId: args.paymentId,
            failureReason: args.failureReason,
            renewalAttempt: args.renewalAttempt,
        })
            .catch(() => undefined);
        if (args.renewalAttempt >= 4) {
            await this.platformRevenue
                ?.onSubscriptionCancelled({ companyId: args.companyId, companyName: args.companyName })
                .catch(() => undefined);
        }
    }
    async onTrialExpired(args) {
        await this.prisma.company.update({
            where: { id: args.companyId },
            data: { subscriptionStatus: 'EXPIRED' },
        });
        await this.mail.sendCampaignEmail({
            companyId: args.companyId,
            companyName: args.companyName,
            recipient: args.ownerEmail,
            campaignKey: 'trial_expired_day_0',
            context: { trialDays: (0, plan_config_1.getTrialDays)() },
        });
    }
    async resolveOwnerEmail(companyId) {
        const owner = await this.prisma.user.findFirst({
            where: {
                shop: { companyId },
                role: { name: 'OWNER' },
                isActive: true,
                deletedAt: null,
            },
            select: { email: true, shop: { select: { company: { select: { companyName: true } } } } },
            orderBy: { createdAt: 'asc' },
        });
        if (!owner?.email)
            return null;
        return {
            email: owner.email,
            companyName: owner.shop?.company?.companyName ?? 'there',
        };
    }
};
exports.LifecycleOrchestratorService = LifecycleOrchestratorService;
exports.LifecycleOrchestratorService = LifecycleOrchestratorService = LifecycleOrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        subscription_invoice_service_1.SubscriptionInvoiceService,
        platform_lifecycle_mail_service_1.PlatformLifecycleMailService, Object])
], LifecycleOrchestratorService);
//# sourceMappingURL=lifecycle-orchestrator.service.js.map