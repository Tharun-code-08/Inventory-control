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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const audit_service_1 = require("../audit/audit.service");
const document_number_service_1 = require("../stock/document-number.service");
const money_1 = require("../../common/utils/money");
const idempotency_1 = require("../../common/utils/idempotency");
const serializable_tx_1 = require("../../common/utils/serializable-tx");
const subscription_service_1 = require("../billing/subscription.service");
const email_notifications_service_1 = require("../email-notifications/email-notifications.service");
const email_notifications_outbound_1 = require("../email-notifications/email-notifications.outbound");
const email_formatters_1 = require("../../common/mail/email-formatters");
const document_email_service_1 = require("../document-email/document-email.service");
let PaymentsService = class PaymentsService {
    prisma;
    audit;
    numbers;
    subscriptions;
    emailNotifications;
    documentEmail;
    constructor(prisma, audit, numbers, subscriptions, emailNotifications, documentEmail) {
        this.prisma = prisma;
        this.audit = audit;
        this.numbers = numbers;
        this.subscriptions = subscriptions;
        this.emailNotifications = emailNotifications;
        this.documentEmail = documentEmail;
    }
    async list(user, query = {}) {
        const take = query.take && query.take > 0 ? Math.min(query.take, 100) : 20;
        const where = {};
        if (user.shopId)
            where.shopId = user.shopId;
        if (query.invoice_id)
            where.invoiceId = query.invoice_id;
        const rows = await this.prisma.paymentReceipt.findMany({
            where,
            take: take + 1,
            ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
            orderBy: { id: 'asc' },
            select: {
                id: true,
                receiptNumber: true,
                receiptDate: true,
                amount: true,
                method: true,
                reference: true,
                invoiceId: true,
                shopId: true,
                invoice: { select: { id: true, invoiceNumber: true, totalValue: true, paidValue: true } },
            },
        });
        const hasMore = rows.length > take;
        const items = hasMore ? rows.slice(0, take) : rows;
        const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;
        return { data: items, meta: { nextCursor, limit: take, hasMore } };
    }
    async create(user, dto) {
        const amount = (0, money_1.roundMoney)((0, money_1.asMoney)(dto.amount ?? 0));
        (0, money_1.assertPositiveMoney)(amount, 'Payment amount');
        return (0, serializable_tx_1.runSerializableTxWithRetry)(this.prisma, async (tx) => {
            const idempotencyKey = dto.idempotencyKey;
            const cached = await (0, idempotency_1.getIdempotentResult)(tx, idempotencyKey, 'payment:create');
            if (cached?.paymentId) {
                const prior = await tx.paymentReceipt.findUnique({
                    where: { id: cached.paymentId },
                    include: { invoice: true, shop: true },
                });
                if (prior)
                    return prior;
            }
            const invoice = await tx.invoiceHeader.findUnique({ where: { id: dto.invoiceId } });
            if (!invoice)
                throw new common_1.NotFoundException('Invoice not found');
            (0, shop_scope_1.assertShopScope)(user, invoice.shopId);
            await this.subscriptions.assertFeatureForShop(invoice.shopId, 'payments');
            if (invoice.status === client_1.InvoiceStatus.VOID) {
                throw new common_1.BadRequestException('Cannot collect payment on a voided invoice');
            }
            const openBalance = (0, money_1.roundMoney)((0, money_1.asMoney)(invoice.totalValue).sub(invoice.paidValue));
            (0, money_1.assertNonNegativeMoney)(openBalance, 'Invoice open balance');
            if (amount.gt(openBalance)) {
                throw new common_1.BadRequestException(`Payment amount exceeds open balance (${openBalance.toString()})`);
            }
            const newPaid = (0, money_1.roundMoney)((0, money_1.asMoney)(invoice.paidValue).add(amount));
            const status = newPaid.greaterThanOrEqualTo(invoice.totalValue)
                ? client_1.InvoiceStatus.PAID
                : client_1.InvoiceStatus.PARTIALLY_PAID;
            const updated = await tx.invoiceHeader.updateMany({
                where: { id: invoice.id, paidValue: invoice.paidValue },
                data: {
                    paidValue: newPaid,
                    status,
                    updatedById: user.id,
                },
            });
            if (updated.count === 0) {
                throw new common_1.ConflictException('Invoice was modified by another payment. Please retry.');
            }
            const receiptNumber = dto.receiptNumber?.trim() ||
                (await this.numbers.nextNumber(tx, {
                    shopId: invoice.shopId,
                    docType: 'RCPT',
                    prefix: 'RCPT',
                    date: dto.receiptDate ? new Date(dto.receiptDate) : new Date(),
                }));
            const payment = await tx.paymentReceipt.create({
                data: {
                    receiptNumber,
                    receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : new Date(),
                    invoiceId: invoice.id,
                    shopId: invoice.shopId,
                    amount,
                    method: dto.method ?? null,
                    reference: dto.reference ?? null,
                    remarks: dto.remarks ?? null,
                    createdById: user.id,
                },
                include: { invoice: { include: { customer: true } }, shop: true },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.POST,
                entityType: 'PAYMENT_RECEIPT',
                entityId: payment.id,
                newValues: {
                    receiptNumber: payment.receiptNumber,
                    invoiceId: payment.invoiceId,
                    amount: payment.amount.toString(),
                    status,
                },
            }, tx);
            await (0, idempotency_1.setIdempotentResult)(tx, idempotencyKey, { paymentId: payment.id }, user.id, 'payment:create');
            return payment;
        }).then(async (payment) => {
            await this.autoSendPaymentReceivedEmail(user, payment).catch(() => undefined);
            return payment;
        });
    }
    async get(user, id) {
        const payment = await this.prisma.paymentReceipt.findUnique({
            where: { id },
            include: { invoice: { include: { customer: true } }, shop: true },
        });
        if (!payment)
            throw new common_1.NotFoundException('Payment receipt not found');
        (0, shop_scope_1.assertShopScope)(user, payment.shopId);
        await this.subscriptions.assertFeatureForShop(payment.shopId, 'payments');
        return payment;
    }
    async sendToCustomer(user, id, options) {
        const payment = await this.get(user, id);
        const recipient = payment.invoice.customer?.email?.trim();
        if (!recipient) {
            throw new common_1.BadRequestException(`Customer email is missing for "${payment.invoice.customer?.customerName ?? 'Customer'}". Add an email on the customer record and try again.`);
        }
        const shop = await this.prisma.shop.findUnique({
            where: { id: payment.shopId },
            select: { companyId: true, company: { select: { companyName: true } } },
        });
        if (!shop?.companyId) {
            throw new common_1.BadRequestException('Shop not linked to a company');
        }
        const content = this.buildPaymentEmailContent(payment, shop.company?.companyName ?? 'Company');
        const defaults = (0, email_notifications_outbound_1.paymentReceivedDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(payment.shopId, 'payment_received', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled) {
            throw new common_1.BadRequestException('Payment email notifications are disabled in settings.');
        }
        const trigger = options?.resend ? client_1.DocumentEmailTrigger.RESEND : client_1.DocumentEmailTrigger.MANUAL;
        return this.documentEmail.sendPaymentEmail(user, {
            paymentId: id,
            companyId: shop.companyId,
            shopId: payment.shopId,
            recipient,
            content,
            prepared,
            documentNumber: payment.receiptNumber,
            trigger,
        });
    }
    buildPaymentEmailContent(payment, companyName) {
        const balance = Number(payment.invoice.totalValue) - Number(payment.invoice.paidValue);
        return {
            customerName: payment.invoice.customer?.customerName ?? 'Customer',
            invoiceNumber: payment.invoice.invoiceNumber,
            receiptNumber: payment.receiptNumber,
            amountPaid: (0, email_formatters_1.formatEmailMoney)(payment.amount),
            balanceDue: (0, email_formatters_1.formatEmailMoney)(Math.max(balance, 0)),
            paymentType: balance <= 0 ? 'Full' : 'Partial',
            companyName,
        };
    }
    async autoSendPaymentReceivedEmail(user, payment) {
        const recipient = payment.invoice.customer?.email?.trim();
        if (!recipient)
            return;
        const shop = await this.prisma.shop.findUnique({
            where: { id: payment.shopId },
            select: { companyId: true, company: { select: { companyName: true } } },
        });
        if (!shop?.companyId)
            return;
        const content = this.buildPaymentEmailContent(payment, shop.company?.companyName ?? 'Company');
        const defaults = (0, email_notifications_outbound_1.paymentReceivedDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(payment.shopId, 'payment_received', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled)
            return;
        await this.documentEmail.sendPaymentEmail(user, {
            paymentId: payment.id,
            companyId: shop.companyId,
            shopId: payment.shopId,
            recipient,
            content,
            prepared,
            documentNumber: payment.receiptNumber,
            trigger: client_1.DocumentEmailTrigger.AUTO,
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        document_number_service_1.DocumentNumberService,
        subscription_service_1.SubscriptionService,
        email_notifications_service_1.EmailNotificationsService,
        document_email_service_1.DocumentEmailService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map