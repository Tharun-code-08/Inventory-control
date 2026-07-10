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
exports.SupplierPaymentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const assert_company_id_1 = require("../../common/utils/assert-company-id");
const audit_service_1 = require("../audit/audit.service");
const document_number_service_1 = require("../stock/document-number.service");
const money_1 = require("../../common/utils/money");
const idempotency_1 = require("../../common/utils/idempotency");
const serializable_tx_1 = require("../../common/utils/serializable-tx");
const email_notifications_service_1 = require("../email-notifications/email-notifications.service");
const email_notifications_outbound_1 = require("../email-notifications/email-notifications.outbound");
const email_formatters_1 = require("../../common/mail/email-formatters");
const document_email_service_1 = require("../document-email/document-email.service");
const assert_action_1 = require("../../common/state-machines/assert-action");
const assert_transition_1 = require("../../common/state-machines/assert-transition");
const document_actions_1 = require("../../common/state-machines/document-actions");
const document_audit_1 = require("../../common/state-machines/document-audit");
let SupplierPaymentsService = class SupplierPaymentsService {
    prisma;
    audit;
    numbers;
    emailNotifications;
    documentEmail;
    constructor(prisma, audit, numbers, emailNotifications, documentEmail) {
        this.prisma = prisma;
        this.audit = audit;
        this.numbers = numbers;
        this.emailNotifications = emailNotifications;
        this.documentEmail = documentEmail;
    }
    async list(user, query = {}) {
        const take = query.take && query.take > 0 ? Math.min(query.take, 100) : 20;
        const where = {};
        if (user.shopId)
            where.shopId = user.shopId;
        if (query.supplier_bill_id)
            where.supplierBillId = query.supplier_bill_id;
        const rows = await this.prisma.supplierPayment.findMany({
            where,
            take: take + 1,
            ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
            orderBy: { id: 'asc' },
            select: {
                id: true,
                paymentNumber: true,
                paymentDate: true,
                amount: true,
                method: true,
                reference: true,
                supplierBillId: true,
                shopId: true,
                supplierBill: {
                    select: { id: true, billNumber: true, totalValue: true, paidValue: true },
                },
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
            const cached = await (0, idempotency_1.getIdempotentResult)(tx, idempotencyKey, 'supplier-payment:create');
            if (cached?.paymentId) {
                const prior = await tx.supplierPayment.findUnique({
                    where: { id: cached.paymentId },
                    include: { supplierBill: { include: { supplier: true } }, shop: true },
                });
                if (prior)
                    return prior;
            }
            const bill = await tx.supplierBillHeader.findUnique({ where: { id: dto.supplierBillId } });
            if (!bill)
                throw new common_1.NotFoundException('Supplier bill not found');
            (0, shop_scope_1.assertShopScope)(user, bill.shopId);
            if (bill.status === client_1.SupplierBillStatus.VOID) {
                throw new common_1.BadRequestException('Cannot pay a voided supplier bill');
            }
            (0, assert_action_1.assertSupplierBillAction)(bill.status, document_actions_1.SupplierBillAction.RECORD_PAYMENT);
            const openBalance = (0, money_1.roundMoney)((0, money_1.asMoney)(bill.totalValue).sub(bill.paidValue));
            (0, money_1.assertNonNegativeMoney)(openBalance, 'Supplier bill open balance');
            if (amount.gt(openBalance)) {
                throw new common_1.BadRequestException(`Payment amount exceeds open balance (${openBalance.toString()})`);
            }
            const newPaid = (0, money_1.roundMoney)((0, money_1.asMoney)(bill.paidValue).add(amount));
            const status = newPaid.greaterThanOrEqualTo(bill.totalValue)
                ? client_1.SupplierBillStatus.PAID
                : client_1.SupplierBillStatus.PARTIALLY_PAID;
            if (status !== bill.status) {
                (0, assert_transition_1.assertSupplierBillTransition)(bill.status, status);
            }
            const updated = await tx.supplierBillHeader.updateMany({
                where: { id: bill.id, paidValue: bill.paidValue },
                data: {
                    paidValue: newPaid,
                    status,
                    updatedById: user.id,
                },
            });
            if (updated.count === 0) {
                throw new common_1.ConflictException('Supplier bill was modified by another payment. Please retry.');
            }
            const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
            const paymentNumber = dto.paymentNumber?.trim() ||
                (await this.numbers.nextNumber(tx, {
                    shopId: bill.shopId,
                    docType: 'SPAY',
                    prefix: 'SPAY',
                    date: paymentDate,
                }));
            const payment = await tx.supplierPayment.create({
                data: {
                    paymentNumber,
                    paymentDate,
                    supplierBillId: bill.id,
                    shopId: bill.shopId,
                    amount,
                    method: dto.method ?? null,
                    reference: dto.reference ?? null,
                    remarks: dto.remarks ?? null,
                    createdById: user.id,
                },
                include: { supplierBill: { include: { supplier: true } }, shop: true },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.POST,
                entityType: 'SUPPLIER_PAYMENT',
                entityId: payment.id,
                newValues: {
                    paymentNumber: payment.paymentNumber,
                    supplierBillId: payment.supplierBillId,
                    amount: payment.amount.toString(),
                    billStatus: status,
                },
            }, tx);
            if (status !== bill.status) {
                await this.audit.log((0, document_audit_1.buildStatusTransitionAudit)({
                    companyId: (0, assert_company_id_1.assertCompanyId)(user),
                    userId: user.id,
                    entityType: 'SUPPLIER_BILL',
                    entityId: bill.id,
                    fromStatus: bill.status,
                    toStatus: status,
                    reason: 'paymentRecorded',
                }), tx);
            }
            await this.audit.log((0, document_audit_1.buildDocumentActionAudit)({
                companyId: (0, assert_company_id_1.assertCompanyId)(user),
                userId: user.id,
                entityType: 'SUPPLIER_PAYMENT',
                entityId: payment.id,
                action: 'RECORD_SUPPLIER_PAYMENT',
                result: 'success',
                detail: {
                    supplierBillId: bill.id,
                    amount: payment.amount.toString(),
                    billStatus: status,
                },
            }), tx);
            await (0, idempotency_1.setIdempotentResult)(tx, idempotencyKey, { paymentId: payment.id }, user.id, 'supplier-payment:create');
            return payment;
        }).then(async (payment) => {
            await this.autoSendSupplierPaymentEmail(user, payment).catch(() => undefined);
            return payment;
        });
    }
    async reverse(user, id, dto = {}) {
        const reason = dto.reason?.trim() || null;
        return (0, serializable_tx_1.runSerializableTxWithRetry)(this.prisma, async (tx) => {
            const payment = await tx.supplierPayment.findUnique({
                where: { id },
                include: { supplierBill: true },
            });
            if (!payment)
                throw new common_1.NotFoundException('Supplier payment not found');
            (0, shop_scope_1.assertShopScope)(user, payment.shopId);
            const bill = payment.supplierBill;
            if (bill.status === client_1.SupplierBillStatus.VOID) {
                throw new common_1.BadRequestException('Cannot reverse a payment on a voided supplier bill');
            }
            const newPaid = (0, money_1.roundMoney)((0, money_1.asMoney)(bill.paidValue).sub(payment.amount));
            if (newPaid.lt(0)) {
                throw new common_1.BadRequestException('Payment reversal would make the bill paid value negative');
            }
            const newStatus = newPaid.eq(0)
                ? client_1.SupplierBillStatus.ISSUED
                : newPaid.greaterThanOrEqualTo(bill.totalValue)
                    ? client_1.SupplierBillStatus.PAID
                    : client_1.SupplierBillStatus.PARTIALLY_PAID;
            if (newStatus !== bill.status) {
                (0, assert_transition_1.assertSupplierBillReversalTransition)(bill.status, newStatus);
            }
            const updatedBill = await tx.supplierBillHeader.updateMany({
                where: { id: bill.id, paidValue: bill.paidValue },
                data: {
                    paidValue: newPaid,
                    status: newStatus,
                    updatedById: user.id,
                },
            });
            if (updatedBill.count === 0) {
                throw new common_1.ConflictException('Supplier bill was modified concurrently. Refresh and retry the reversal.');
            }
            await tx.supplierPayment.delete({ where: { id } });
            if (newStatus !== bill.status) {
                await this.audit.log((0, document_audit_1.buildStatusTransitionAudit)({
                    companyId: (0, assert_company_id_1.assertCompanyId)(user),
                    userId: user.id,
                    entityType: 'SUPPLIER_BILL',
                    entityId: bill.id,
                    fromStatus: bill.status,
                    toStatus: newStatus,
                    reason: reason ?? 'paymentReversed',
                }), tx);
            }
            await this.audit.log((0, document_audit_1.buildDocumentActionAudit)({
                companyId: (0, assert_company_id_1.assertCompanyId)(user),
                userId: user.id,
                entityType: 'SUPPLIER_PAYMENT',
                entityId: payment.id,
                action: document_actions_1.SupplierPaymentAction.REVERSE,
                result: 'success',
                detail: {
                    supplierBillId: bill.id,
                    amount: payment.amount.toString(),
                    reason,
                    billStatus: newStatus,
                    paidValue: newPaid.toString(),
                },
            }), tx);
            return {
                ok: true,
                reversedPaymentId: payment.id,
                supplierBillId: bill.id,
                paidValue: newPaid.toString(),
                status: newStatus,
            };
        });
    }
    async get(user, id) {
        const payment = await this.prisma.supplierPayment.findUnique({
            where: { id },
            include: { supplierBill: { include: { supplier: true } }, shop: true },
        });
        if (!payment)
            throw new common_1.NotFoundException('Supplier payment not found');
        (0, shop_scope_1.assertShopScope)(user, payment.shopId);
        return payment;
    }
    async sendToSupplier(user, id, options) {
        const payment = await this.get(user, id);
        const supplier = payment.supplierBill.supplier;
        const recipient = supplier.email?.trim();
        if (!recipient) {
            throw new common_1.BadRequestException(`Supplier email is missing for "${supplier.supplierName}". Add an email on the supplier record and try again.`);
        }
        const shop = await this.prisma.shop.findUnique({
            where: { id: payment.shopId },
            select: { companyId: true, company: { select: { companyName: true } } },
        });
        if (!shop?.companyId) {
            throw new common_1.BadRequestException('Shop not linked to a company');
        }
        const content = this.buildSupplierPaymentEmailContent(payment, shop.company?.companyName ?? 'Company');
        const defaults = (0, email_notifications_outbound_1.supplierPaymentRecordedDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(payment.shopId, 'supplier_payment_recorded', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled) {
            throw new common_1.BadRequestException('Supplier payment email notifications are disabled in settings.');
        }
        const trigger = options?.resend ? client_1.DocumentEmailTrigger.RESEND : client_1.DocumentEmailTrigger.MANUAL;
        return this.documentEmail.sendSupplierPaymentEmail(user, {
            paymentId: id,
            companyId: shop.companyId,
            shopId: payment.shopId,
            recipient,
            content,
            prepared,
            documentNumber: payment.paymentNumber,
            trigger,
        });
    }
    buildSupplierPaymentEmailContent(payment, companyName) {
        const balance = Number(payment.supplierBill.totalValue) - Number(payment.supplierBill.paidValue);
        return {
            supplierName: payment.supplierBill.supplier.supplierName,
            billNumber: payment.supplierBill.billNumber,
            paymentNumber: payment.paymentNumber,
            amountPaid: (0, email_formatters_1.formatEmailMoney)(payment.amount),
            balanceDue: (0, email_formatters_1.formatEmailMoney)(Math.max(balance, 0)),
            paymentType: balance <= 0 ? 'Full' : 'Partial',
            companyName,
        };
    }
    async autoSendSupplierPaymentEmail(user, payment) {
        const recipient = payment.supplierBill.supplier.email?.trim();
        if (!recipient)
            return;
        const shop = await this.prisma.shop.findUnique({
            where: { id: payment.shopId },
            select: { companyId: true, company: { select: { companyName: true } } },
        });
        if (!shop?.companyId)
            return;
        const content = this.buildSupplierPaymentEmailContent(payment, shop.company?.companyName ?? 'Company');
        const defaults = (0, email_notifications_outbound_1.supplierPaymentRecordedDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(payment.shopId, 'supplier_payment_recorded', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled)
            return;
        await this.documentEmail.sendSupplierPaymentEmail(user, {
            paymentId: payment.id,
            companyId: shop.companyId,
            shopId: payment.shopId,
            recipient,
            content,
            prepared,
            documentNumber: payment.paymentNumber,
            trigger: client_1.DocumentEmailTrigger.AUTO,
        });
    }
};
exports.SupplierPaymentsService = SupplierPaymentsService;
exports.SupplierPaymentsService = SupplierPaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        document_number_service_1.DocumentNumberService,
        email_notifications_service_1.EmailNotificationsService,
        document_email_service_1.DocumentEmailService])
], SupplierPaymentsService);
//# sourceMappingURL=supplier-payments.service.js.map