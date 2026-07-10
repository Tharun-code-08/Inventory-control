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
exports.SalesOrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const money_1 = require("../../common/utils/money");
const gst_supply_type_1 = require("../../common/utils/gst-supply-type");
const sales_order_gst_1 = require("../../common/utils/sales-order-gst");
const pagination_1 = require("../../common/utils/pagination");
const audit_service_1 = require("../audit/audit.service");
const document_number_service_1 = require("../stock/document-number.service");
const costing_service_1 = require("../stock/costing.service");
const stock_service_1 = require("../stock/stock.service");
const serializable_tx_1 = require("../../common/utils/serializable-tx");
const idempotency_1 = require("../../common/utils/idempotency");
const subscription_service_1 = require("../billing/subscription.service");
const email_notifications_service_1 = require("../email-notifications/email-notifications.service");
const email_notifications_outbound_1 = require("../email-notifications/email-notifications.outbound");
const email_formatters_1 = require("../../common/mail/email-formatters");
const document_email_service_1 = require("../document-email/document-email.service");
let SalesOrdersService = class SalesOrdersService {
    prisma;
    stock;
    numbers;
    audit;
    costing;
    subscriptions;
    emailNotifications;
    documentEmail;
    constructor(prisma, stock, numbers, audit, costing, subscriptions, emailNotifications, documentEmail) {
        this.prisma = prisma;
        this.stock = stock;
        this.numbers = numbers;
        this.audit = audit;
        this.costing = costing;
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
            where.orderDate = {};
            if (query.date_from)
                where.orderDate.gte = new Date(query.date_from);
            if (query.date_to)
                where.orderDate.lte = new Date(query.date_to);
        }
        const rows = await this.prisma.salesOrderHeader.findMany({
            where,
            take: take + 1,
            ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
            orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }],
            select: {
                id: true,
                soNumber: true,
                orderDate: true,
                expectedDate: true,
                status: true,
                totalValue: true,
                remarks: true,
                shopId: true,
                customerId: true,
                customer: { select: { id: true, customerCode: true, customerName: true } },
                shop: { select: { id: true, shopName: true, shopNumber: true } },
            },
        });
        const { items, meta } = (0, pagination_1.buildMeta)(rows, take);
        return { data: items, meta };
    }
    async resolveSupplyType(shopId, customerId, override) {
        if (override)
            return override;
        const [shop, customer] = await Promise.all([
            this.prisma.shop.findUnique({ where: { id: shopId }, select: { taxId: true } }),
            this.prisma.customer.findUnique({ where: { id: customerId }, select: { taxId: true } }),
        ]);
        return (0, gst_supply_type_1.resolveGstSupplyType)({
            shopTaxId: shop?.taxId,
            customerTaxId: customer?.taxId,
        });
    }
    computeLineTotals(items, supplyType) {
        let total = new client_1.Prisma.Decimal(0);
        let totalDiscount = new client_1.Prisma.Decimal(0);
        let totalTax = new client_1.Prisma.Decimal(0);
        let subtotalBeforeTax = new client_1.Prisma.Decimal(0);
        let totalCgst = new client_1.Prisma.Decimal(0);
        let totalSgst = new client_1.Prisma.Decimal(0);
        let totalIgst = new client_1.Prisma.Decimal(0);
        const lines = (items ?? []).map((item) => {
            const computed = (0, sales_order_gst_1.computeSalesOrderLineTotals)({ ...item, supplyType }, supplyType);
            total = total.add(computed.lineValue);
            totalDiscount = totalDiscount.add(computed.discountAmount);
            totalTax = totalTax.add(computed.taxAmount);
            subtotalBeforeTax = subtotalBeforeTax.add(computed.taxable);
            totalCgst = totalCgst.add(computed.cgstAmount);
            totalSgst = totalSgst.add(computed.sgstAmount);
            totalIgst = totalIgst.add(computed.igstAmount);
            return {
                productId: item.productId,
                quantity: computed.quantity,
                uom: item.uom ?? 'UNIT',
                unitPrice: computed.unitPrice,
                discountAmount: computed.discountAmount,
                cgstRate: computed.cgstRate,
                sgstRate: computed.sgstRate,
                igstRate: computed.igstRate,
                taxRate: computed.taxRate,
                taxAmount: computed.taxAmount,
                lineValue: computed.lineValue,
            };
        });
        return {
            lines,
            total: (0, money_1.roundMoney)(total),
            totalDiscount: (0, money_1.roundMoney)(totalDiscount),
            totalTax: (0, money_1.roundMoney)(totalTax),
            subtotalBeforeTax: (0, money_1.roundMoney)(subtotalBeforeTax),
            totalCgst: (0, money_1.roundMoney)(totalCgst),
            totalSgst: (0, money_1.roundMoney)(totalSgst),
            totalIgst: (0, money_1.roundMoney)(totalIgst),
            supplyType,
        };
    }
    async create(user, dto) {
        const shopId = dto.shopId ?? user.shopId;
        if (!shopId)
            throw new common_1.BadRequestException('shopId is required');
        (0, shop_scope_1.assertShopScope)(user, shopId);
        await this.subscriptions.assertFeatureForShop(shopId, 'sales_orders');
        if (dto.customerId) {
            const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
            if (!customer || customer.shopId !== shopId) {
                throw new common_1.BadRequestException('Customer must belong to the selected shop');
            }
        }
        const orderDate = dto.orderDate ? new Date(dto.orderDate) : new Date();
        const supplyType = await this.resolveSupplyType(shopId, dto.customerId, dto.gstSupplyType);
        const { lines, total, totalDiscount, totalTax, subtotalBeforeTax, totalCgst, totalSgst, totalIgst, } = this.computeLineTotals(dto.items, supplyType);
        const idempotencyScope = user.companyId
            ? `company:${user.companyId}`
            : user.shopId
                ? `shop:${user.shopId}`
                : 'global';
        const idempotencyCacheKey = dto.idempotencyKey?.trim()
            ? `so:create:${dto.idempotencyKey.trim()}`
            : undefined;
        return (0, serializable_tx_1.runSerializableTxWithRetry)(this.prisma, async (tx) => {
            const existing = await (0, idempotency_1.tryGetIdempotentResult)(tx, idempotencyCacheKey, idempotencyScope);
            if (existing?.soId) {
                const prior = await tx.salesOrderHeader.findUnique({
                    where: { id: existing.soId },
                    include: { customer: true, items: { include: { product: true } } },
                });
                if (prior)
                    return prior;
            }
            const soNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
                shopId,
                docType: 'SO',
                date: orderDate,
            });
            const created = await tx.salesOrderHeader.create({
                data: {
                    soNumber,
                    orderDate,
                    expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
                    customerId: dto.customerId,
                    shopId,
                    status: client_1.SalesOrderStatus.DRAFT,
                    fulfillmentStatus: client_1.FulfillmentStatus.NONE,
                    remarks: dto.remarks ?? null,
                    currency: dto.currency ?? 'USD',
                    fxRateUsed: dto.fxRateUsed != null ? new client_1.Prisma.Decimal(dto.fxRateUsed) : null,
                    discountAmount: totalDiscount,
                    taxAmount: totalTax,
                    totalValue: total,
                    gstSupplyType: supplyType,
                    subtotalBeforeTax,
                    totalCgst,
                    totalSgst,
                    totalIgst,
                    createdById: user.id,
                    items: {
                        create: lines.map((line) => ({
                            productId: line.productId,
                            quantity: line.quantity,
                            uom: line.uom,
                            unitPrice: line.unitPrice,
                            discountAmount: line.discountAmount,
                            cgstRate: line.cgstRate,
                            sgstRate: line.sgstRate,
                            igstRate: line.igstRate,
                            taxRate: line.taxRate,
                            taxAmount: line.taxAmount,
                            lineValue: line.lineValue,
                            createdById: user.id,
                        })),
                    },
                },
                include: { customer: true, items: { include: { product: true } } },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.CREATE,
                entityType: 'SALES_ORDER',
                entityId: created.id,
                newValues: {
                    soNumber: created.soNumber,
                    customerId: created.customerId,
                    totalValue: created.totalValue?.toString() ?? '0',
                    itemCount: lines.length,
                },
            }, tx);
            await (0, idempotency_1.trySetIdempotentResult)(tx, idempotencyCacheKey, { soId: created.id }, user.id, idempotencyScope);
            return created;
        });
    }
    async get(user, id) {
        const so = await this.prisma.salesOrderHeader.findUnique({
            where: { id },
            include: {
                customer: true,
                shop: { select: { id: true, shopName: true, shopNumber: true } },
                items: { include: { product: true } },
                salesQuotation: { select: { id: true, quoteNumber: true } },
            },
        });
        if (!so)
            throw new common_1.NotFoundException('Sales order not found');
        (0, shop_scope_1.assertShopScope)(user, so.shopId);
        await this.subscriptions.assertFeatureForShop(so.shopId, 'sales_orders');
        return so;
    }
    async update(user, id, dto) {
        const so = await this.get(user, id);
        if (so.status !== client_1.SalesOrderStatus.DRAFT) {
            throw new common_1.BadRequestException('Only DRAFT sales orders can be updated');
        }
        const orderDate = dto.orderDate ? new Date(dto.orderDate) : so.orderDate;
        const customerId = dto.customerId ?? so.customerId;
        const supplyType = await this.resolveSupplyType(so.shopId, customerId, dto.gstSupplyType ?? so.gstSupplyType);
        const items = dto.items ?? so.items.map((line) => ({
            productId: line.productId,
            quantity: Number(line.quantity),
            uom: line.uom,
            unitPrice: Number(line.unitPrice),
            discountAmount: Number(line.discountAmount),
            taxRate: Number(line.taxRate),
            cgstRate: Number(line.cgstRate ?? 0),
            sgstRate: Number(line.sgstRate ?? 0),
            igstRate: Number(line.igstRate ?? 0),
        }));
        const { lines, total, totalDiscount, totalTax, subtotalBeforeTax, totalCgst, totalSgst, totalIgst, } = this.computeLineTotals(items, supplyType);
        return (0, serializable_tx_1.runSerializableTxWithRetry)(this.prisma, async (tx) => {
            await tx.salesOrderItem.deleteMany({ where: { soHeaderId: id } });
            const updated = await tx.salesOrderHeader.update({
                where: { id },
                data: {
                    orderDate,
                    expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : so.expectedDate,
                    customerId: dto.customerId ?? so.customerId,
                    remarks: dto.remarks !== undefined ? dto.remarks : so.remarks,
                    discountAmount: totalDiscount,
                    taxAmount: totalTax,
                    totalValue: total,
                    gstSupplyType: supplyType,
                    subtotalBeforeTax,
                    totalCgst,
                    totalSgst,
                    totalIgst,
                    updatedById: user.id,
                    items: {
                        create: lines.map((line) => ({
                            productId: line.productId,
                            quantity: line.quantity,
                            uom: line.uom,
                            unitPrice: line.unitPrice,
                            discountAmount: line.discountAmount,
                            cgstRate: line.cgstRate,
                            sgstRate: line.sgstRate,
                            igstRate: line.igstRate,
                            taxRate: line.taxRate,
                            taxAmount: line.taxAmount,
                            lineValue: line.lineValue,
                            createdById: user.id,
                        })),
                    },
                },
                include: {
                    customer: true,
                    shop: { select: { id: true, shopName: true, shopNumber: true } },
                    items: { include: { product: true } },
                    salesQuotation: { select: { id: true, quoteNumber: true } },
                },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.UPDATE,
                entityType: 'SALES_ORDER',
                entityId: id,
                newValues: { soNumber: updated.soNumber, totalValue: updated.totalValue?.toString() ?? '0' },
            }, tx);
            return updated;
        });
    }
    async remove(user, id) {
        const so = await this.get(user, id);
        if (so.status !== client_1.SalesOrderStatus.DRAFT) {
            throw new common_1.BadRequestException('Only DRAFT sales orders can be deleted');
        }
        await (0, serializable_tx_1.runSerializableTxWithRetry)(this.prisma, async (tx) => {
            await tx.salesOrderHeader.delete({ where: { id } });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.DELETE,
                entityType: 'SALES_ORDER',
                entityId: id,
                oldValues: { soNumber: so.soNumber },
            }, tx);
        });
        return { deleted: true, id };
    }
    async confirm(user, id) {
        const so = await this.get(user, id);
        if (so.status === client_1.SalesOrderStatus.CONFIRMED)
            return so;
        if (so.status !== client_1.SalesOrderStatus.DRAFT) {
            throw new common_1.BadRequestException(`Cannot confirm sales order in status ${so.status}`);
        }
        const confirmed = await (0, serializable_tx_1.runSerializableTxWithRetry)(this.prisma, async (tx) => {
            const updated = await tx.salesOrderHeader.updateMany({
                where: { id, status: client_1.SalesOrderStatus.DRAFT },
                data: { status: client_1.SalesOrderStatus.CONFIRMED, updatedById: user.id },
            });
            if (updated.count === 0) {
                throw new common_1.ConflictException('Sales order state changed concurrently');
            }
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.UPDATE,
                entityType: 'SALES_ORDER',
                entityId: id,
                newValues: { status: client_1.SalesOrderStatus.CONFIRMED },
            }, tx);
            return tx.salesOrderHeader.findUniqueOrThrow({
                where: { id },
                include: {
                    customer: true,
                    shop: { select: { shopName: true } },
                    items: { include: { product: true } },
                },
            });
        });
        await this.autoSendSalesOrderEmail(user, confirmed).catch(() => undefined);
        return confirmed;
    }
    async sendToCustomer(user, id, options) {
        const order = await this.get(user, id);
        if (order.status === client_1.SalesOrderStatus.DRAFT) {
            throw new common_1.BadRequestException('Confirm the sales order before emailing it to the customer.');
        }
        const recipient = order.customer.email?.trim();
        if (!recipient) {
            throw new common_1.BadRequestException(`Customer email is missing for "${order.customer.customerName}". Add an email on the customer record and try again.`);
        }
        const shop = await this.prisma.shop.findUnique({
            where: { id: order.shopId },
            select: { companyId: true, company: { select: { companyName: true } } },
        });
        if (!shop?.companyId) {
            throw new common_1.BadRequestException('Shop not linked to a company');
        }
        const content = this.buildSalesOrderEmailContent(order, shop.company?.companyName ?? 'Company');
        const defaults = (0, email_notifications_outbound_1.salesOrderCustomerDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(order.shopId, 'sales_order_customer', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled) {
            throw new common_1.BadRequestException('Sales order email notifications are disabled in settings.');
        }
        const trigger = options?.resend ? client_1.DocumentEmailTrigger.RESEND : client_1.DocumentEmailTrigger.MANUAL;
        return this.documentEmail.sendSalesOrderEmail(user, {
            salesOrderId: id,
            companyId: shop.companyId,
            shopId: order.shopId,
            recipient,
            content,
            prepared,
            documentNumber: order.soNumber,
            trigger,
        });
    }
    buildSalesOrderEmailContent(order, companyName) {
        const total = order.totalValue != null
            ? Number(order.totalValue)
            : 0;
        return {
            customerName: order.customer.customerName,
            soNumber: order.soNumber,
            orderDate: (0, email_formatters_1.formatEmailDate)(order.orderDate),
            expectedDate: (0, email_formatters_1.formatEmailDate)(order.expectedDate),
            totalAmount: (0, email_formatters_1.formatEmailMoney)(total, order.currency || 'INR'),
            shopName: order.shop?.shopName ?? '—',
            companyName,
        };
    }
    async autoSendSalesOrderEmail(user, order) {
        const recipient = order.customer.email?.trim();
        if (!recipient)
            return;
        const shop = await this.prisma.shop.findUnique({
            where: { id: order.shopId },
            select: { companyId: true, company: { select: { companyName: true } } },
        });
        if (!shop?.companyId)
            return;
        const content = this.buildSalesOrderEmailContent(order, shop.company?.companyName ?? 'Company');
        const defaults = (0, email_notifications_outbound_1.salesOrderCustomerDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(order.shopId, 'sales_order_customer', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled)
            return;
        await this.documentEmail.sendSalesOrderEmail(user, {
            salesOrderId: order.id,
            companyId: shop.companyId,
            shopId: order.shopId,
            recipient,
            content,
            prepared,
            documentNumber: order.soNumber,
            trigger: client_1.DocumentEmailTrigger.AUTO,
        });
    }
    async fulfill(user, id) {
        const so = await this.get(user, id);
        if (so.status === client_1.SalesOrderStatus.FULFILLED)
            return so;
        if (so.status !== client_1.SalesOrderStatus.CONFIRMED) {
            throw new common_1.BadRequestException(`Cannot fulfill sales order in status ${so.status}; must be CONFIRMED`);
        }
        for (const item of so.items) {
            const remaining = new client_1.Prisma.Decimal(item.quantity).sub(item.shippedQty);
            if (remaining.gt(0)) {
                await this.fulfillItem(user, id, item.id, remaining);
            }
        }
        return this.get(user, id);
    }
    async fulfillItem(user, soId, itemId, qty) {
        const requestedQty = (0, money_1.asMoney)(qty);
        if (requestedQty.lte(0)) {
            throw new common_1.BadRequestException('Quantity must be positive');
        }
        const so = await this.get(user, soId);
        if (so.status !== client_1.SalesOrderStatus.CONFIRMED) {
            throw new common_1.BadRequestException(`Cannot fulfill sales order in status ${so.status}; must be CONFIRMED`);
        }
        const item = so.items.find((it) => it.id === itemId);
        if (!item)
            throw new common_1.NotFoundException('Sales order line not found');
        const remaining = new client_1.Prisma.Decimal(item.quantity).sub(item.shippedQty);
        if (remaining.lte(0))
            throw new common_1.BadRequestException('Line is already fully shipped');
        if (requestedQty.gt(remaining)) {
            throw new common_1.BadRequestException(`Requested ${requestedQty.toString()} but only ${remaining.toString()} remains on this line`);
        }
        const shop = await this.prisma.shop.findUnique({
            where: { id: so.shopId },
            select: { costingMethod: true },
        });
        const method = shop?.costingMethod ?? client_1.CostingMethod.AVERAGE;
        return (0, serializable_tx_1.runSerializableTxWithRetry)(this.prisma, async (tx) => {
            const bumped = await tx.salesOrderItem.updateMany({
                where: { id: itemId, soHeaderId: soId, shippedQty: item.shippedQty },
                data: { shippedQty: new client_1.Prisma.Decimal(item.shippedQty).add(requestedQty) },
            });
            if (bumped.count === 0) {
                throw new common_1.ConflictException('Sales order line was modified concurrently');
            }
            const { unitCost } = await this.costing.recordOutflow(tx, {
                shopId: so.shopId,
                productId: item.productId,
                qty: requestedQty,
                method,
            });
            await this.stock.postMovementOnce(tx, {
                type: client_1.TransactionType.GOODS_ISSUE,
                ref: so.soNumber,
                date: new Date(),
                shopId: so.shopId,
                productId: item.productId,
                inQty: 0,
                outQty: requestedQty,
                unitRate: unitCost.gt(0) ? unitCost : item.unitPrice,
                remarks: 'Sales order fulfillment',
                sourceType: 'SALES_ORDER',
                sourceId: so.id,
                sourceLineId: item.id,
                idempotencyKey: `so-fulfill:${so.id}:${item.id}:${item.shippedQty.toString()}`,
                userId: user.id,
            });
            const linesAfter = await tx.salesOrderItem.findMany({
                where: { soHeaderId: soId },
                select: { quantity: true, shippedQty: true },
            });
            const allShipped = linesAfter.every((l) => new client_1.Prisma.Decimal(l.shippedQty).gte(l.quantity));
            const anyShipped = linesAfter.some((l) => new client_1.Prisma.Decimal(l.shippedQty).gt(0));
            const next = allShipped
                ? client_1.FulfillmentStatus.FULL
                : anyShipped
                    ? client_1.FulfillmentStatus.PARTIAL
                    : client_1.FulfillmentStatus.NONE;
            await tx.salesOrderHeader.update({
                where: { id: soId },
                data: {
                    fulfillmentStatus: next,
                    ...(allShipped ? { status: client_1.SalesOrderStatus.FULFILLED } : {}),
                    updatedById: user.id,
                },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.POST,
                entityType: 'SALES_ORDER',
                entityId: soId,
                newValues: {
                    event: 'fulfillItem',
                    itemId,
                    qty: requestedQty.toString(),
                    fulfillmentStatus: next,
                },
            }, tx);
            return tx.salesOrderHeader.findUniqueOrThrow({
                where: { id: soId },
                include: { customer: true, items: { include: { product: true } } },
            });
        });
    }
};
exports.SalesOrdersService = SalesOrdersService;
exports.SalesOrdersService = SalesOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stock_service_1.StockService,
        document_number_service_1.DocumentNumberService,
        audit_service_1.AuditService,
        costing_service_1.CostingService,
        subscription_service_1.SubscriptionService,
        email_notifications_service_1.EmailNotificationsService,
        document_email_service_1.DocumentEmailService])
], SalesOrdersService);
//# sourceMappingURL=sales-orders.service.js.map