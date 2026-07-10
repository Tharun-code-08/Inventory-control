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
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const money_1 = require("../../common/utils/money");
const pagination_1 = require("../../common/utils/pagination");
const idempotency_1 = require("../../common/utils/idempotency");
const audit_service_1 = require("../audit/audit.service");
const document_number_service_1 = require("../stock/document-number.service");
const subscription_service_1 = require("../billing/subscription.service");
const email_notifications_service_1 = require("../email-notifications/email-notifications.service");
const email_notifications_outbound_1 = require("../email-notifications/email-notifications.outbound");
const email_formatters_1 = require("../../common/mail/email-formatters");
const document_email_service_1 = require("../document-email/document-email.service");
let InvoicesService = class InvoicesService {
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
        const take = (0, pagination_1.clampTake)(query.take);
        if (query.shop_id)
            (0, shop_scope_1.assertShopScope)(user, query.shop_id);
        const where = {
            shop: (0, shop_scope_1.shopListWhere)(user),
            ...(query.shop_id ? { shopId: query.shop_id } : {}),
        };
        if (query.status)
            where.status = query.status;
        if (query.customer_id)
            where.customerId = query.customer_id;
        if (query.date_from || query.date_to) {
            where.invoiceDate = {};
            if (query.date_from)
                where.invoiceDate.gte = new Date(query.date_from);
            if (query.date_to)
                where.invoiceDate.lte = new Date(query.date_to);
        }
        const rows = await this.prisma.invoiceHeader.findMany({
            where,
            take: take + 1,
            ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
            orderBy: { id: 'asc' },
            select: {
                id: true,
                invoiceNumber: true,
                invoiceDate: true,
                dueDate: true,
                status: true,
                totalValue: true,
                paidValue: true,
                salesOrderId: true,
                shopId: true,
                customerId: true,
                customer: { select: { id: true, customerCode: true, customerName: true } },
            },
        });
        const { items, meta } = (0, pagination_1.buildMeta)(rows, take);
        return { data: items, meta };
    }
    async create(user, dto) {
        const shopId = dto.shopId ?? user.shopId;
        if (!shopId)
            throw new common_1.BadRequestException('shopId is required');
        (0, shop_scope_1.assertShopScope)(user, shopId);
        await this.subscriptions.assertFeatureForShop(shopId, 'invoices');
        const customer = await this.prisma.customer.findUnique({
            where: { id: dto.customerId },
            select: { shopId: true },
        });
        if (!customer || customer.shopId !== shopId) {
            throw new common_1.BadRequestException('Customer must belong to the selected shop');
        }
        const totalValue = (0, money_1.roundMoney)((0, money_1.asMoney)(dto.totalValue ?? 0));
        (0, money_1.assertNonNegativeMoney)(totalValue, 'Invoice total');
        const invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : new Date();
        const idempotencyScope = user.companyId
            ? `company:${user.companyId}`
            : user.shopId
                ? `shop:${user.shopId}`
                : 'global';
        const idempotencyCacheKey = dto.idempotencyKey?.trim()
            ? `invoice:create:${dto.idempotencyKey.trim()}`
            : undefined;
        const { invoice, replayed } = await this.prisma.$transaction(async (tx) => {
            const existing = await (0, idempotency_1.tryGetIdempotentResult)(tx, idempotencyCacheKey, idempotencyScope);
            if (existing?.invoiceId) {
                const prior = await tx.invoiceHeader.findUnique({
                    where: { id: existing.invoiceId },
                    include: { customer: true, salesOrder: true, payments: true },
                });
                if (prior)
                    return { invoice: prior, replayed: true };
            }
            if (dto.salesOrderId) {
                const so = await tx.salesOrderHeader.findUnique({
                    where: { id: dto.salesOrderId },
                    include: { invoices: { select: { id: true, status: true } } },
                });
                if (!so)
                    throw new common_1.NotFoundException('Sales order not found');
                if (so.shopId !== shopId) {
                    throw new common_1.BadRequestException('Sales order belongs to a different shop');
                }
                if (so.status === client_1.SalesOrderStatus.CANCELLED ||
                    so.status === client_1.SalesOrderStatus.DRAFT) {
                    throw new common_1.BadRequestException('Cannot invoice a sales order that is DRAFT or CANCELLED');
                }
                const hasOpenInvoice = so.invoices.some((inv) => inv.status !== client_1.InvoiceStatus.VOID);
                if (hasOpenInvoice) {
                    throw new common_1.ConflictException('This sales order has already been invoiced');
                }
            }
            const invoiceNumber = dto.invoiceNumber?.trim() ||
                (await this.numbers.nextNumber(tx, {
                    shopId,
                    docType: 'INV',
                    prefix: 'INV',
                    date: invoiceDate,
                }));
            const invoice = await tx.invoiceHeader.create({
                data: {
                    invoiceNumber,
                    invoiceDate,
                    salesOrderId: dto.salesOrderId ?? null,
                    customerId: dto.customerId,
                    shopId,
                    status: client_1.InvoiceStatus.ISSUED,
                    totalValue,
                    paidValue: new client_1.Prisma.Decimal(0),
                    dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                    remarks: dto.remarks ?? null,
                    createdById: user.id,
                },
                include: { customer: true, salesOrder: true, payments: true },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.CREATE,
                entityType: 'INVOICE',
                entityId: invoice.id,
                newValues: {
                    invoiceNumber: invoice.invoiceNumber,
                    customerId: invoice.customerId,
                    totalValue: invoice.totalValue.toString(),
                    salesOrderId: invoice.salesOrderId,
                },
            }, tx);
            await (0, idempotency_1.trySetIdempotentResult)(tx, idempotencyCacheKey, { invoiceId: invoice.id }, user.id, idempotencyScope);
            return { invoice, replayed: false };
        });
        if (!replayed) {
            await this.autoSendInvoiceCreatedEmail(user, invoice).catch(() => undefined);
        }
        return invoice;
    }
    async sendToCustomer(user, id, options) {
        const invoice = await this.get(user, id);
        const recipient = invoice.customer.email?.trim();
        if (!recipient) {
            throw new common_1.BadRequestException(`Customer email is missing for "${invoice.customer.customerName}". Add an email on the customer record and try again.`);
        }
        const shop = await this.prisma.shop.findUnique({
            where: { id: invoice.shopId },
            select: { companyId: true, company: { select: { companyName: true } } },
        });
        if (!shop?.companyId) {
            throw new common_1.BadRequestException('Shop not linked to a company');
        }
        const content = this.buildInvoiceEmailContent(invoice, shop.company?.companyName ?? 'Company');
        const defaults = (0, email_notifications_outbound_1.invoiceCreatedDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(invoice.shopId, 'invoice_created', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled) {
            throw new common_1.BadRequestException('Invoice email notifications are disabled in settings.');
        }
        const trigger = options?.resend ? client_1.DocumentEmailTrigger.RESEND : client_1.DocumentEmailTrigger.MANUAL;
        return this.documentEmail.sendInvoiceEmail(user, {
            invoiceId: id,
            companyId: shop.companyId,
            shopId: invoice.shopId,
            recipient,
            content,
            prepared,
            documentNumber: invoice.invoiceNumber,
            trigger,
        });
    }
    buildInvoiceEmailContent(invoice, companyName) {
        return {
            customerName: invoice.customer.customerName,
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: (0, email_formatters_1.formatEmailDate)(invoice.invoiceDate),
            dueDate: (0, email_formatters_1.formatEmailDate)(invoice.dueDate),
            totalAmount: (0, email_formatters_1.formatEmailMoney)(invoice.totalValue),
            companyName,
        };
    }
    async autoSendInvoiceCreatedEmail(user, invoice) {
        const recipient = invoice.customer.email?.trim();
        if (!recipient)
            return;
        const shop = await this.prisma.shop.findUnique({
            where: { id: invoice.shopId },
            select: { companyId: true, company: { select: { companyName: true } } },
        });
        if (!shop?.companyId)
            return;
        const content = this.buildInvoiceEmailContent(invoice, shop.company?.companyName ?? 'Company');
        const defaults = (0, email_notifications_outbound_1.invoiceCreatedDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(invoice.shopId, 'invoice_created', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled)
            return;
        await this.documentEmail.sendInvoiceEmail(user, {
            invoiceId: invoice.id,
            companyId: shop.companyId,
            shopId: invoice.shopId,
            recipient,
            content,
            prepared,
            documentNumber: invoice.invoiceNumber,
            trigger: client_1.DocumentEmailTrigger.AUTO,
        });
    }
    async get(user, id) {
        const invoice = await this.prisma.invoiceHeader.findUnique({
            where: { id },
            include: { customer: true, salesOrder: true, payments: true },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        (0, shop_scope_1.assertShopScope)(user, invoice.shopId);
        await this.subscriptions.assertFeatureForShop(invoice.shopId, 'invoices');
        return invoice;
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        document_number_service_1.DocumentNumberService,
        subscription_service_1.SubscriptionService,
        email_notifications_service_1.EmailNotificationsService,
        document_email_service_1.DocumentEmailService])
], InvoicesService);
//# sourceMappingURL=invoices.service.js.map