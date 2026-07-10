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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const crypto_1 = require("crypto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const require_permission_decorator_1 = require("../../common/decorators/require-permission.decorator");
const plan_config_1 = require("../../common/plans/plan-config");
const prisma_service_1 = require("../../prisma/prisma.service");
const lifecycle_orchestrator_service_1 = require("../subscription-lifecycle/lifecycle-orchestrator.service");
const subscription_invoice_service_1 = require("../subscription-lifecycle/subscription-invoice.service");
const billing_dto_1 = require("./dto/billing.dto");
const razorpay_service_1 = require("./razorpay.service");
const subscription_service_1 = require("./subscription.service");
let BillingController = class BillingController {
    razorpay;
    subscriptions;
    prisma;
    lifecycle;
    invoices;
    constructor(razorpay, subscriptions, prisma, lifecycle, invoices) {
        this.razorpay = razorpay;
        this.subscriptions = subscriptions;
        this.prisma = prisma;
        this.lifecycle = lifecycle;
        this.invoices = invoices;
    }
    async createOrder(dto) {
        if (!this.razorpay.isConfigured()) {
            throw new common_1.BadRequestException('Payment gateway is not configured');
        }
        const amountPaise = (0, plan_config_1.orderAmountPaise)(dto.plan, dto.billing);
        const receipt = `rcpt_${(0, crypto_1.randomUUID)().replace(/-/g, '').slice(0, 20)}`;
        try {
            const order = await this.razorpay.createOrder({ amountPaise, receipt });
            await this.prisma.subscriptionPayment.create({
                data: {
                    plan: (0, plan_config_1.toSubscriptionPlan)(dto.plan),
                    billingCycle: (0, plan_config_1.toBillingCycle)(dto.billing),
                    amountPaise,
                    razorpayOrderId: order.orderId,
                    status: 'created',
                },
            });
            return {
                order_id: order.orderId,
                amount: order.amount,
                currency: order.currency,
                key_id: this.razorpay.keyId(),
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to start payment';
            throw new common_1.BadRequestException(`Payment order failed: ${message}`);
        }
    }
    async verifyPayment(dto) {
        const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = dto;
        if (!orderId || !paymentId || !signature) {
            throw new common_1.BadRequestException('Missing payment verification fields');
        }
        if (!this.razorpay.verifyPaymentSignature({ orderId, paymentId, signature })) {
            throw new common_1.BadRequestException('Payment signature verification failed');
        }
        const payment = await this.prisma.subscriptionPayment.findUnique({
            where: { razorpayOrderId: orderId },
        });
        if (!payment) {
            throw new common_1.BadRequestException('Order not found');
        }
        const now = new Date();
        await this.prisma.subscriptionPayment.update({
            where: { id: payment.id },
            data: {
                razorpayPaymentId: paymentId,
                status: 'paid',
                verifiedAt: now,
            },
        });
        return {
            ok: true,
            order_id: orderId,
            payment_id: paymentId,
            plan: payment.plan,
            billing_cycle: payment.billingCycle,
        };
    }
    async subscription(user) {
        const snap = await this.subscriptions.getSnapshotForUser(user);
        if (!snap)
            throw new common_1.BadRequestException('No organisation linked to this account');
        return snap;
    }
    async upgrade(user, dto) {
        const companyId = await this.subscriptions.resolveCompanyIdForUser(user);
        if (!companyId)
            throw new common_1.BadRequestException('No organisation linked to this account');
        const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = dto;
        if (!this.razorpay.verifyPaymentSignature({ orderId, paymentId, signature })) {
            throw new common_1.UnauthorizedException('Payment signature verification failed');
        }
        const payment = await this.prisma.subscriptionPayment.findUnique({
            where: { razorpayOrderId: orderId },
        });
        if (!payment || payment.status !== 'paid') {
            throw new common_1.BadRequestException('Payment not verified');
        }
        if (payment.consumedAt && payment.companyId && payment.companyId !== companyId) {
            throw new common_1.BadRequestException('Payment already used by another organisation');
        }
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: { subscriptionPlan: true, companyName: true },
        });
        if (!company) {
            throw new common_1.BadRequestException('Organisation not found');
        }
        if ((0, plan_config_1.isDowngrade)(company.subscriptionPlan, payment.plan)) {
            throw new common_1.BadRequestException(`Downgrades are not allowed. Current plan: ${company.subscriptionPlan}, requested: ${payment.plan}.`);
        }
        await this.subscriptions.activatePaidPlan({
            companyId,
            plan: payment.plan,
            billingCycle: payment.billingCycle,
            paymentId,
            orderId,
            amountPaise: payment.amountPaise,
        });
        const owner = await this.lifecycle.resolveOwnerEmail(companyId);
        if (owner) {
            void this.lifecycle.onSubscriptionActivated({
                companyId,
                ownerEmail: owner.email,
                companyName: company.companyName,
                plan: payment.plan,
                billingCycle: payment.billingCycle,
                amountPaise: payment.amountPaise,
                paymentId: payment.id,
            });
        }
        return this.subscriptions.getSnapshotForUser(user);
    }
    async marketingOptOut(user) {
        const companyId = await this.subscriptions.resolveCompanyIdForUser(user);
        if (!companyId)
            throw new common_1.BadRequestException('No organisation linked to this account');
        await this.prisma.company.update({
            where: { id: companyId },
            data: { platformMarketingOptOut: true },
        });
        return { ok: true };
    }
    async listInvoices(user) {
        const companyId = await this.subscriptions.resolveCompanyIdForUser(user);
        if (!companyId)
            throw new common_1.BadRequestException('No organisation linked to this account');
        return this.invoices.listForCompany(companyId);
    }
    async downloadInvoicePdf(user, invoiceId, res) {
        const companyId = await this.subscriptions.resolveCompanyIdForUser(user);
        if (!companyId)
            throw new common_1.BadRequestException('No organisation linked to this account');
        const { buffer, filename } = await this.invoices.renderPdfBuffer(companyId, invoiceId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(buffer);
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('create-order'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Create Razorpay order for Pro/Plus checkout' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [billing_dto_1.CreateOrderDto]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createOrder", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('verify-payment'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Verify Razorpay payment signature' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [billing_dto_1.VerifyPaymentDto]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "verifyPayment", null);
__decorate([
    (0, common_1.Get)('subscription'),
    (0, require_permission_decorator_1.RequirePermission)('billing:manage'),
    (0, swagger_1.ApiOperation)({ summary: 'Current organisation subscription snapshot' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "subscription", null);
__decorate([
    (0, common_1.Post)('upgrade'),
    (0, require_permission_decorator_1.RequirePermission)('billing:manage'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Apply verified payment to current organisation' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, billing_dto_1.VerifyPaymentDto]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "upgrade", null);
__decorate([
    (0, common_1.Post)('marketing-opt-out'),
    (0, require_permission_decorator_1.RequirePermission)('billing:manage'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Opt out of platform marketing lifecycle emails' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "marketingOptOut", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, require_permission_decorator_1.RequirePermission)('billing:manage'),
    (0, swagger_1.ApiOperation)({ summary: 'List SaaS subscription invoices for current organisation' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "listInvoices", null);
__decorate([
    (0, common_1.Get)('invoices/:id/pdf'),
    (0, require_permission_decorator_1.RequirePermission)('billing:manage'),
    (0, swagger_1.ApiOperation)({ summary: 'Download SaaS subscription invoice PDF' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "downloadInvoicePdf", null);
exports.BillingController = BillingController = __decorate([
    (0, swagger_1.ApiTags)('billing'),
    (0, common_1.Controller)('billing'),
    __metadata("design:paramtypes", [razorpay_service_1.RazorpayService,
        subscription_service_1.SubscriptionService,
        prisma_service_1.PrismaService,
        lifecycle_orchestrator_service_1.LifecycleOrchestratorService,
        subscription_invoice_service_1.SubscriptionInvoiceService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map