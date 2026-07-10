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
exports.SalesQuotationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const mail_service_1 = require("../../common/mail/mail.service");
const portal_url_1 = require("../../common/mail/portal-url");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const money_1 = require("../../common/utils/money");
const document_number_service_1 = require("../stock/document-number.service");
const subscription_service_1 = require("../billing/subscription.service");
const email_notifications_service_1 = require("../email-notifications/email-notifications.service");
const email_notifications_outbound_1 = require("../email-notifications/email-notifications.outbound");
const document_email_service_1 = require("../document-email/document-email.service");
let SalesQuotationsService = class SalesQuotationsService {
    prisma;
    numbers;
    mail;
    config;
    subscriptions;
    emailNotifications;
    documentEmail;
    constructor(prisma, numbers, mail, config, subscriptions, emailNotifications, documentEmail) {
        this.prisma = prisma;
        this.numbers = numbers;
        this.mail = mail;
        this.config = config;
        this.subscriptions = subscriptions;
        this.emailNotifications = emailNotifications;
        this.documentEmail = documentEmail;
    }
    computeLines(items) {
        let total = new client_1.Prisma.Decimal(0);
        const lines = items.map((item) => {
            const quantity = (0, money_1.asMoney)(item.quantity ?? 0);
            const unitPrice = (0, money_1.asMoney)(item.unitPrice ?? 0);
            const lineValue = (0, money_1.roundMoney)(quantity.mul(unitPrice));
            total = total.add(lineValue);
            return {
                productId: item.productId,
                quantity,
                uom: item.uom ?? 'UNIT',
                unitPrice: (0, money_1.roundMoney)(unitPrice),
                lineValue,
            };
        });
        return { lines, total: (0, money_1.roundMoney)(total) };
    }
    newPortalToken() {
        return (0, crypto_1.randomBytes)(32).toString('hex');
    }
    async emailQuotation(user, row, options, trigger) {
        const customerEmail = row.customer.email?.trim();
        if (!customerEmail) {
            throw new common_1.BadRequestException('Customer has no email address. Add an email on the customer profile before sending.');
        }
        const portalUrl = (0, portal_url_1.buildQuotationPortalReviewUrl)(this.config, options.portalToken);
        const emailContent = this.mail.buildSalesQuotationEmailContent({
            customerName: row.customer.customerName,
            quoteNumber: row.quoteNumber,
            quoteDate: row.quoteDate,
            validUntil: row.validUntil,
            shopName: row.shop.shopName,
            remarks: row.remarks,
            totalValue: row.totalValue ?? 0,
            items: row.items,
            portalUrl,
            isRevision: options.isRevision ?? false,
        });
        const defaults = (0, email_notifications_outbound_1.salesQuotationDefaults)(emailContent);
        const prepared = await this.emailNotifications.prepareTemplateForShop(row.shopId, 'sales_quotation_customer', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled) {
            throw new common_1.BadRequestException('Sales quotation email notifications are disabled in settings.');
        }
        if (!row.shop.companyId) {
            throw new common_1.BadRequestException('Shop is not linked to a company');
        }
        return this.documentEmail.sendSalesQuotationEmail(user, {
            quoteId: row.id,
            companyId: row.shop.companyId,
            shopId: row.shopId,
            recipient: customerEmail,
            content: emailContent,
            prepared,
            documentNumber: row.quoteNumber,
            trigger,
        });
    }
    withEmailDelivery(row, delivery) {
        return {
            ...row,
            emailDelivery: delivery.sent
                ? {
                    messageId: '',
                    to: delivery.to,
                    from: delivery.to,
                    replyTo: delivery.to,
                }
                : undefined,
        };
    }
    async list(user, customerId) {
        return this.prisma.salesQuotationHeader.findMany({
            where: {
                shop: (0, shop_scope_1.shopListWhere)(user),
                ...(customerId ? { customerId } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                customer: {
                    select: { id: true, customerCode: true, customerName: true, email: true },
                },
                items: { include: { product: { select: { id: true, productCode: true, description: true } } } },
            },
        });
    }
    async get(user, id) {
        const row = await this.prisma.salesQuotationHeader.findUnique({
            where: { id },
            include: {
                customer: true,
                shop: { select: { id: true, shopName: true, shopNumber: true, companyId: true } },
                items: { include: { product: true } },
                salesOrder: { select: { id: true, soNumber: true, status: true } },
            },
        });
        if (!row)
            throw new common_1.NotFoundException('Sales quotation not found');
        (0, shop_scope_1.assertShopScope)(user, row.shopId);
        await this.subscriptions.assertFeatureForShop(row.shopId, 'sales_quotations');
        return row;
    }
    async create(user, dto) {
        const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found');
        const shopId = dto.shopId ?? customer.shopId;
        (0, shop_scope_1.assertShopScope)(user, shopId);
        await this.subscriptions.assertFeatureForShop(shopId, 'sales_quotations');
        const quoteDate = dto.quoteDate ? new Date(dto.quoteDate) : new Date();
        const { lines, total } = this.computeLines(dto.items);
        return this.prisma.$transaction(async (tx) => {
            const quoteNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
                shopId,
                docType: 'SQT',
                date: quoteDate,
            });
            return tx.salesQuotationHeader.create({
                data: {
                    quoteNumber,
                    quoteDate,
                    validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
                    customerId: dto.customerId,
                    shopId,
                    status: client_1.SalesQuotationStatus.DRAFT,
                    remarks: dto.remarks ?? null,
                    totalValue: total,
                    createdById: user.id,
                    items: {
                        create: lines.map((line) => ({
                            ...line,
                            createdById: user.id,
                        })),
                    },
                },
                include: {
                    customer: true,
                    items: { include: { product: true } },
                },
            });
        });
    }
    async update(user, id, dto) {
        const row = await this.get(user, id);
        if (row.status !== client_1.SalesQuotationStatus.DRAFT &&
            row.status !== client_1.SalesQuotationStatus.USER_REQUESTED) {
            throw new common_1.BadRequestException('Only draft or customer-requested quotations can be edited');
        }
        const computed = dto.items?.length ? this.computeLines(dto.items) : null;
        return this.prisma.$transaction(async (tx) => {
            if (dto.items?.length) {
                await tx.salesQuotationItem.deleteMany({ where: { quoteHeaderId: id } });
            }
            return tx.salesQuotationHeader.update({
                where: { id },
                data: {
                    ...(dto.quoteDate ? { quoteDate: new Date(dto.quoteDate) } : {}),
                    ...(dto.validUntil !== undefined
                        ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null }
                        : {}),
                    ...(dto.remarks !== undefined ? { remarks: dto.remarks ?? null } : {}),
                    ...(computed ? { totalValue: computed.total } : {}),
                    updatedById: user.id,
                    ...(computed
                        ? {
                            items: {
                                create: computed.lines.map((line) => ({
                                    ...line,
                                    createdById: user.id,
                                })),
                            },
                        }
                        : {}),
                },
                include: {
                    customer: true,
                    shop: { select: { id: true, shopName: true, shopNumber: true, companyId: true } },
                    items: { include: { product: true } },
                },
            });
        });
    }
    async send(user, id) {
        const row = await this.get(user, id);
        if (row.status !== client_1.SalesQuotationStatus.DRAFT) {
            throw new common_1.BadRequestException('Only draft quotations can be sent');
        }
        const portalToken = row.portalToken ?? this.newPortalToken();
        const delivery = await this.emailQuotation(user, row, { portalToken }, client_1.DocumentEmailTrigger.MANUAL);
        const updated = await this.prisma.salesQuotationHeader.update({
            where: { id },
            data: {
                status: client_1.SalesQuotationStatus.SENT,
                portalToken,
                customerRequestedTotal: null,
                customerRequestNote: null,
                customerRespondedAt: null,
                updatedById: user.id,
            },
            include: {
                customer: true,
                shop: { select: { id: true, shopName: true, shopNumber: true, companyId: true } },
                items: { include: { product: true } },
            },
        });
        return this.withEmailDelivery(updated, delivery);
    }
    async sendEmail(user, id, options) {
        const row = await this.get(user, id);
        if (row.status === client_1.SalesQuotationStatus.DRAFT) {
            return this.send(user, id);
        }
        const portalToken = row.portalToken ?? this.newPortalToken();
        if (!row.portalToken) {
            await this.prisma.salesQuotationHeader.update({
                where: { id },
                data: { portalToken, updatedById: user.id },
            });
        }
        const trigger = options?.resend ? client_1.DocumentEmailTrigger.RESEND : client_1.DocumentEmailTrigger.MANUAL;
        return this.emailQuotation(user, { ...row, portalToken }, { portalToken, isRevision: row.status === client_1.SalesQuotationStatus.USER_REQUESTED }, trigger);
    }
    async resend(user, id) {
        const row = await this.get(user, id);
        if (row.status !== client_1.SalesQuotationStatus.USER_REQUESTED) {
            throw new common_1.BadRequestException('Only quotations with a customer pricing request can be resent');
        }
        const portalToken = row.portalToken ?? this.newPortalToken();
        const delivery = await this.emailQuotation(user, row, { portalToken, isRevision: true }, client_1.DocumentEmailTrigger.RESEND);
        const updated = await this.prisma.salesQuotationHeader.update({
            where: { id },
            data: {
                status: client_1.SalesQuotationStatus.SENT,
                portalToken,
                customerRequestedTotal: null,
                customerRequestNote: null,
                customerRespondedAt: null,
                updatedById: user.id,
            },
            include: {
                customer: true,
                shop: { select: { id: true, shopName: true, shopNumber: true, companyId: true } },
                items: { include: { product: true } },
            },
        });
        return this.withEmailDelivery(updated, delivery);
    }
    async cancel(user, id) {
        const row = await this.get(user, id);
        if (row.status !== client_1.SalesQuotationStatus.USER_REQUESTED &&
            row.status !== client_1.SalesQuotationStatus.SENT) {
            throw new common_1.BadRequestException('Only sent quotations or customer pricing requests can be cancelled');
        }
        return this.prisma.salesQuotationHeader.update({
            where: { id },
            data: { status: client_1.SalesQuotationStatus.CANCELLED, updatedById: user.id },
            include: {
                customer: true,
                items: { include: { product: true } },
            },
        });
    }
    async accept(user, id) {
        const row = await this.get(user, id);
        if (row.status !== client_1.SalesQuotationStatus.SENT) {
            throw new common_1.BadRequestException('Only sent quotations can be accepted');
        }
        return this.prisma.salesQuotationHeader.update({
            where: { id },
            data: { status: client_1.SalesQuotationStatus.ACCEPTED, updatedById: user.id },
            include: {
                customer: true,
                items: { include: { product: true } },
            },
        });
    }
    async convertToSalesOrder(user, id) {
        const row = await this.get(user, id);
        if (row.status === client_1.SalesQuotationStatus.CONVERTED) {
            throw new common_1.BadRequestException('Quotation is already converted to a sales order');
        }
        if (row.status !== client_1.SalesQuotationStatus.SENT && row.status !== client_1.SalesQuotationStatus.ACCEPTED) {
            throw new common_1.BadRequestException('Send or accept the quotation before converting to a sales order');
        }
        if (!row.items.length) {
            throw new common_1.BadRequestException('Quotation has no line items');
        }
        const orderDate = new Date();
        return this.prisma.$transaction(async (tx) => {
            const soNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
                shopId: row.shopId,
                docType: 'SO',
                date: orderDate,
            });
            const salesOrder = await tx.salesOrderHeader.create({
                data: {
                    soNumber,
                    orderDate,
                    customerId: row.customerId,
                    shopId: row.shopId,
                    status: client_1.SalesOrderStatus.DRAFT,
                    remarks: row.remarks ? `From ${row.quoteNumber}: ${row.remarks}` : `From ${row.quoteNumber}`,
                    totalValue: row.totalValue,
                    createdById: user.id,
                    items: {
                        create: row.items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            uom: item.uom,
                            unitPrice: item.unitPrice,
                            lineValue: item.lineValue,
                            createdById: user.id,
                        })),
                    },
                },
            });
            return tx.salesQuotationHeader.update({
                where: { id },
                data: {
                    status: client_1.SalesQuotationStatus.CONVERTED,
                    salesOrderId: salesOrder.id,
                    updatedById: user.id,
                },
                include: {
                    customer: true,
                    items: { include: { product: true } },
                    salesOrder: { select: { id: true, soNumber: true, status: true } },
                },
            });
        });
    }
};
exports.SalesQuotationsService = SalesQuotationsService;
exports.SalesQuotationsService = SalesQuotationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        document_number_service_1.DocumentNumberService,
        mail_service_1.MailService,
        config_1.ConfigService,
        subscription_service_1.SubscriptionService,
        email_notifications_service_1.EmailNotificationsService,
        document_email_service_1.DocumentEmailService])
], SalesQuotationsService);
//# sourceMappingURL=sales-quotations.service.js.map