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
var SubscriptionInvoiceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionInvoiceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const plan_config_1 = require("../../common/plans/plan-config");
const subscription_invoice_builder_1 = require("../../common/pdf/builders/subscription-invoice.builder");
const html_to_pdf_service_1 = require("../../common/pdf/html-to-pdf.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const subscription_lifecycle_constants_1 = require("./subscription-lifecycle.constants");
let SubscriptionInvoiceService = SubscriptionInvoiceService_1 = class SubscriptionInvoiceService {
    prisma;
    logger = new common_1.Logger(SubscriptionInvoiceService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async nextInvoiceNumber(issuedAt = new Date()) {
        const y = issuedAt.getFullYear();
        const m = String(issuedAt.getMonth() + 1).padStart(2, '0');
        const prefix = `SINV-${y}${m}-`;
        const last = await this.prisma.subscriptionInvoice.findFirst({
            where: { invoiceNumber: { startsWith: prefix } },
            orderBy: { invoiceNumber: 'desc' },
            select: { invoiceNumber: true },
        });
        const seq = last ? Number(last.invoiceNumber.slice(prefix.length)) + 1 : 1;
        return `${prefix}${String(seq).padStart(5, '0')}`;
    }
    async createInvoice(args) {
        const taxPaise = args.taxPaise ?? 0;
        const totalPaise = args.amountPaise + taxPaise;
        const issuedAt = args.issuedAt ?? new Date();
        const invoiceNumber = await this.nextInvoiceNumber(issuedAt);
        return this.prisma.$transaction(async (tx) => {
            const invoice = await tx.subscriptionInvoice.create({
                data: {
                    invoiceNumber,
                    companyId: args.companyId,
                    plan: args.plan,
                    billingCycle: args.billingCycle,
                    amountPaise: args.amountPaise,
                    taxPaise,
                    totalPaise,
                    gstNumber: args.billingAddress?.gstNumber ?? subscription_lifecycle_constants_1.SOFTDIGIT_PLATFORM.gstNumber,
                    billingAddressSnapshot: args.billingAddress ?? undefined,
                    issuedAt,
                },
            });
            if (args.paymentId) {
                await tx.subscriptionPayment.update({
                    where: { id: args.paymentId },
                    data: { invoiceId: invoice.id },
                });
            }
            return invoice;
        });
    }
    async backfillInvoicesForCompany(companyId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: {
                companyName: true,
                address: true,
                subscriptionPlan: true,
                billingCycle: true,
                paidActivatedAt: true,
                createdAt: true,
            },
        });
        if (!company)
            return 0;
        const billingAddress = {
            companyName: company.companyName,
            address: company.address ?? undefined,
        };
        const paymentsWithoutInvoice = await this.prisma.subscriptionPayment.findMany({
            where: {
                companyId,
                status: 'paid',
                invoiceId: null,
                plan: { in: [client_1.SubscriptionPlan.PRO, client_1.SubscriptionPlan.PLUS] },
            },
            orderBy: [{ verifiedAt: 'asc' }, { createdAt: 'asc' }],
        });
        let created = 0;
        for (const payment of paymentsWithoutInvoice) {
            const issuedAt = payment.verifiedAt ?? payment.consumedAt ?? payment.createdAt;
            await this.createInvoice({
                companyId,
                plan: payment.plan,
                billingCycle: payment.billingCycle,
                amountPaise: payment.amountPaise,
                paymentId: payment.id,
                billingAddress,
                issuedAt,
            });
            created += 1;
        }
        const isPaidPlan = company.subscriptionPlan === client_1.SubscriptionPlan.PRO ||
            company.subscriptionPlan === client_1.SubscriptionPlan.PLUS;
        if (created === 0 && isPaidPlan) {
            const existing = await this.prisma.subscriptionInvoice.count({ where: { companyId } });
            if (existing === 0 && company.billingCycle) {
                const planId = subscriptionPlanToPlanId(company.subscriptionPlan);
                const interval = billingCycleToInterval(company.billingCycle);
                const amountPaise = (0, plan_config_1.orderAmountPaise)(planId, interval);
                const issuedAt = company.paidActivatedAt ?? company.createdAt;
                await this.createInvoice({
                    companyId,
                    plan: company.subscriptionPlan,
                    billingCycle: company.billingCycle,
                    amountPaise,
                    billingAddress,
                    issuedAt,
                });
                created += 1;
                this.logger.log(`Backfilled legacy subscription invoice for company ${companyId}`);
            }
        }
        if (created > 0) {
            this.logger.log(`Backfilled ${created} subscription invoice(s) for company ${companyId}`);
        }
        return created;
    }
    async backfillAllPaidCompanies() {
        const companies = await this.prisma.company.findMany({
            where: {
                subscriptionPlan: { in: [client_1.SubscriptionPlan.PRO, client_1.SubscriptionPlan.PLUS] },
                isActive: true,
            },
            select: { id: true },
        });
        let invoices = 0;
        for (const company of companies) {
            invoices += await this.backfillInvoicesForCompany(company.id);
        }
        return { companies: companies.length, invoices };
    }
    async listForCompany(companyId) {
        await this.backfillInvoicesForCompany(companyId);
        return this.prisma.subscriptionInvoice.findMany({
            where: { companyId },
            orderBy: { issuedAt: 'desc' },
            select: {
                id: true,
                invoiceNumber: true,
                plan: true,
                billingCycle: true,
                totalPaise: true,
                currency: true,
                issuedAt: true,
            },
        });
    }
    async getForCompany(companyId, invoiceId) {
        const invoice = await this.prisma.subscriptionInvoice.findFirst({
            where: { id: invoiceId, companyId },
            include: {
                company: { select: { companyName: true, address: true, companyCode: true } },
            },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        return invoice;
    }
    async renderPdfBuffer(companyId, invoiceId) {
        const invoice = await this.getForCompany(companyId, invoiceId);
        const html = (0, subscription_invoice_builder_1.buildSubscriptionInvoicePdfHtml)(invoice);
        const buffer = await (0, html_to_pdf_service_1.renderHtmlToPdfBuffer)(html);
        return {
            buffer,
            filename: (0, subscription_invoice_builder_1.subscriptionInvoicePdfFilename)(invoice.invoiceNumber),
        };
    }
};
exports.SubscriptionInvoiceService = SubscriptionInvoiceService;
exports.SubscriptionInvoiceService = SubscriptionInvoiceService = SubscriptionInvoiceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionInvoiceService);
function subscriptionPlanToPlanId(plan) {
    return plan === client_1.SubscriptionPlan.PLUS ? 'plus' : 'pro';
}
function billingCycleToInterval(cycle) {
    return cycle === client_1.BillingCycle.YEARLY ? 'yearly' : 'monthly';
}
//# sourceMappingURL=subscription-invoice.service.js.map