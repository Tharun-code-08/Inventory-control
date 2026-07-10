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
var BillingWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingWebhookController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const prisma_service_1 = require("../../prisma/prisma.service");
const lifecycle_orchestrator_service_1 = require("../subscription-lifecycle/lifecycle-orchestrator.service");
const platform_revenue_service_1 = require("../platform-notifications/platform-revenue.service");
const lifecycle_rules_constants_1 = require("../subscription-lifecycle/lifecycle-rules.constants");
const razorpay_service_1 = require("./razorpay.service");
let BillingWebhookController = BillingWebhookController_1 = class BillingWebhookController {
    razorpay;
    prisma;
    lifecycle;
    platformRevenue;
    logger = new common_1.Logger(BillingWebhookController_1.name);
    constructor(razorpay, prisma, lifecycle, platformRevenue) {
        this.razorpay = razorpay;
        this.prisma = prisma;
        this.lifecycle = lifecycle;
        this.platformRevenue = platformRevenue;
    }
    async handleRazorpay(req, signature) {
        const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
        if (!this.razorpay.verifyWebhookSignature(rawBody, signature ?? '')) {
            throw new common_1.UnauthorizedException('Invalid webhook signature');
        }
        const payload = (typeof req.body === 'object' ? req.body : JSON.parse(rawBody.toString()));
        const event = payload.event ?? '';
        if (event === 'payment.captured') {
            await this.handlePaymentCaptured(payload);
        }
        else if (event === 'payment.failed') {
            await this.handlePaymentFailed(payload);
        }
        else if (event === 'subscription.charged') {
            this.logger.log('subscription.charged received — auto-renewal stub (Phase 4)');
        }
        return { ok: true };
    }
    async handlePaymentCaptured(payload) {
        const paymentEntity = payload.payload?.payment?.entity;
        const orderId = paymentEntity?.order_id;
        const paymentId = paymentEntity?.id;
        if (!orderId || !paymentId)
            return;
        const payment = await this.prisma.subscriptionPayment.findUnique({
            where: { razorpayOrderId: orderId },
            include: { company: { select: { companyName: true, paidActivatedAt: true } } },
        });
        if (!payment)
            return;
        const wasPaid = payment.status === 'paid';
        await this.prisma.subscriptionPayment.update({
            where: { id: payment.id },
            data: {
                razorpayPaymentId: paymentId,
                status: 'paid',
                verifiedAt: new Date(),
                failureReason: null,
            },
        });
        if (!wasPaid &&
            payment.company?.paidActivatedAt &&
            payment.companyId &&
            payment.company.companyName) {
            await this.platformRevenue
                .onSubscriptionRenewed({
                companyId: payment.companyId,
                companyName: payment.company.companyName,
                plan: payment.plan,
                amountPaise: payment.amountPaise,
                paymentId: payment.id,
            })
                .catch(() => undefined);
        }
    }
    async handlePaymentFailed(payload) {
        const paymentEntity = payload.payload?.payment?.entity;
        const orderId = paymentEntity?.order_id;
        if (!orderId)
            return;
        const payment = await this.prisma.subscriptionPayment.findUnique({
            where: { razorpayOrderId: orderId },
        });
        if (!payment?.companyId)
            return;
        const renewalAttempt = Math.min(payment.renewalAttempt + 1, lifecycle_rules_constants_1.DUNNING_CAMPAIGN_KEYS.length - 1);
        const owner = await this.lifecycle.resolveOwnerEmail(payment.companyId);
        if (!owner)
            return;
        await this.lifecycle.onPaymentFailed({
            companyId: payment.companyId,
            ownerEmail: owner.email,
            companyName: owner.companyName,
            paymentId: payment.id,
            failureReason: paymentEntity?.error_description,
            renewalAttempt,
        });
    }
};
exports.BillingWebhookController = BillingWebhookController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('razorpay'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Razorpay payment webhook (signature verified)' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-razorpay-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingWebhookController.prototype, "handleRazorpay", null);
exports.BillingWebhookController = BillingWebhookController = BillingWebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('billing'),
    (0, common_1.Controller)('billing/webhooks'),
    __metadata("design:paramtypes", [razorpay_service_1.RazorpayService,
        prisma_service_1.PrismaService,
        lifecycle_orchestrator_service_1.LifecycleOrchestratorService,
        platform_revenue_service_1.PlatformRevenueService])
], BillingWebhookController);
//# sourceMappingURL=billing-webhook.controller.js.map