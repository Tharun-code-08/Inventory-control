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
exports.PurchaseOrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const document_pdf_service_1 = require("../../common/pdf/document-pdf.service");
const document_email_service_1 = require("../document-email/document-email.service");
const client_2 = require("@prisma/client");
const assert_company_id_1 = require("../../common/utils/assert-company-id");
const shop_scope_1 = require("../../common/utils/shop-scope");
const shop_access_1 = require("../../common/utils/shop-access");
const audit_context_1 = require("../../common/utils/audit-context");
const assert_action_1 = require("../../common/state-machines/assert-action");
const assert_transition_1 = require("../../common/state-machines/assert-transition");
const document_audit_1 = require("../../common/state-machines/document-audit");
const document_actions_1 = require("../../common/state-machines/document-actions");
const pagination_1 = require("../../common/utils/pagination");
const document_number_service_1 = require("../stock/document-number.service");
const audit_service_1 = require("../audit/audit.service");
const subscription_service_1 = require("../billing/subscription.service");
const rfqs_service_1 = require("../rfqs/rfqs.service");
const email_notifications_service_1 = require("../email-notifications/email-notifications.service");
const email_notifications_outbound_1 = require("../email-notifications/email-notifications.outbound");
const idempotency_1 = require("../../common/utils/idempotency");
const date_guards_1 = require("../../common/utils/date-guards");
const RECEIPT_INCLUDE = {
    select: {
        status: true,
        items: { select: { productId: true, quantity: true } },
    },
};
const RETURN_INCLUDE = {
    select: {
        status: true,
        items: { select: { productId: true, quantity: true } },
    },
};
const ITEM_WITH_PRODUCT = {
    include: {
        product: { select: { id: true, productCode: true, description: true, uom: true } },
    },
};
function isUniqueViolationForFields(error, fields) {
    if (!(error instanceof client_1.Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        return false;
    }
    const target = Array.isArray(error.meta?.target)
        ? (error.meta.target ?? [])
        : [];
    return fields.some((field) => target.includes(field));
}
let PurchaseOrdersService = class PurchaseOrdersService {
    prisma;
    numbers;
    audit;
    subscriptions;
    rfqs;
    emailNotifications;
    documentPdf;
    documentEmail;
    constructor(prisma, numbers, audit, subscriptions, rfqs, emailNotifications, documentPdf, documentEmail) {
        this.prisma = prisma;
        this.numbers = numbers;
        this.audit = audit;
        this.subscriptions = subscriptions;
        this.rfqs = rfqs;
        this.emailNotifications = emailNotifications;
        this.documentPdf = documentPdf;
        this.documentEmail = documentEmail;
    }
    idempotencyScope(user) {
        if (user.companyId)
            return `company:${user.companyId}`;
        if (user.shopId)
            return `shop:${user.shopId}`;
        return 'global';
    }
    createIdempotencyKey(idempotencyKey) {
        return idempotencyKey?.trim() ? `po:create:${idempotencyKey.trim()}` : undefined;
    }
    shopScopedServiceCode(shopNumber) {
        const safe = shopNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'GEN';
        return `SVC-${safe}`;
    }
    auditMeta() {
        return (0, audit_context_1.auditRequestMetadata)();
    }
    async getPoDownstreamLinks(poId) {
        const [goodsReceiptCount, supplierBillCount, supplierPaymentCount, supplierReturnCount] = await Promise.all([
            this.prisma.goodsReceiptHeader.count({ where: { purchaseOrderId: poId } }),
            this.prisma.supplierBillHeader.count({ where: { purchaseOrderId: poId } }),
            this.prisma.supplierPayment.count({
                where: { supplierBill: { purchaseOrderId: poId } },
            }),
            this.prisma.supplierReturn.count({ where: { purchaseOrderId: poId } }),
        ]);
        return {
            goodsReceiptCount,
            supplierBillCount,
            supplierPaymentCount,
            supplierReturnCount,
            hasFinancialLinks: goodsReceiptCount > 0 ||
                supplierBillCount > 0 ||
                supplierPaymentCount > 0 ||
                supplierReturnCount > 0,
        };
    }
    async assertPoMutationAllowed(args) {
        const links = await this.getPoDownstreamLinks(args.poId);
        if (!links.hasFinancialLinks)
            return;
        if (args.action === 'cancel') {
            const parts = [];
            if (links.goodsReceiptCount > 0)
                parts.push(`${links.goodsReceiptCount} goods receipt(s)`);
            if (links.supplierBillCount > 0)
                parts.push(`${links.supplierBillCount} supplier bill(s)`);
            if (links.supplierPaymentCount > 0)
                parts.push(`${links.supplierPaymentCount} payment(s)`);
            if (links.supplierReturnCount > 0)
                parts.push(`${links.supplierReturnCount} supplier return(s)`);
            throw new common_1.BadRequestException(`Cannot cancel this purchase order because downstream documents exist: ${parts.join(', ')}.`);
        }
        const dto = args.dto ?? {};
        if (dto.supplier?.trim() && dto.supplier.trim() !== args.existing.supplier) {
            throw new common_1.BadRequestException('Cannot change supplier because this purchase order is linked to goods receipts, bills, or payments.');
        }
        if (dto.rfqId !== undefined && (dto.rfqId ?? null) !== (args.existing.rfqId ?? null)) {
            throw new common_1.BadRequestException('Cannot change RFQ link because this purchase order is linked to goods receipts, bills, or payments.');
        }
        if (dto.items) {
            throw new common_1.BadRequestException('Cannot change line items because this purchase order is linked to goods receipts, bills, or payments.');
        }
        if (dto.shopId && dto.shopId !== args.existing.shopId) {
            throw new common_1.BadRequestException('Cannot change delivery plant because this purchase order is linked to goods receipts, bills, or payments.');
        }
    }
    async resolvePoLineProduct(tx, shopId, userId, line) {
        const productId = line.productId?.trim();
        const lineDescription = line.lineDescription?.trim();
        if (productId) {
            return {
                productId,
                lineDescription: lineDescription || null,
                lineCategory: line.lineCategory?.trim() || null,
            };
        }
        if (!lineDescription) {
            throw new common_1.BadRequestException('Each line must have a product or a description');
        }
        const shop = await tx.shop.findUnique({
            where: { id: shopId },
            select: { shopNumber: true },
        });
        const serviceCode = this.shopScopedServiceCode(shop?.shopNumber ?? 'GEN');
        let product = await tx.product.findUnique({ where: { productCode: serviceCode } });
        if (!product) {
            product = await tx.product.create({
                data: {
                    productCode: serviceCode,
                    description: 'Service line (PO)',
                    uom: 'EA',
                    category: 'Service',
                    purchasePrice: new client_1.Prisma.Decimal(0),
                    sellingPrice: new client_1.Prisma.Decimal(0),
                    isActive: true,
                    createdById: userId,
                    plants: {
                        create: {
                            shopId,
                            minStockLevel: new client_1.Prisma.Decimal(0),
                            isActive: true,
                            createdById: userId,
                        },
                    },
                },
            });
        }
        else {
            const plant = await tx.productPlant.findFirst({
                where: { productId: product.id, shopId, isActive: true },
            });
            if (!plant) {
                await tx.productPlant.create({
                    data: {
                        productId: product.id,
                        shopId,
                        minStockLevel: new client_1.Prisma.Decimal(0),
                        isActive: true,
                        createdById: userId,
                    },
                });
            }
        }
        return {
            productId: product.id,
            lineDescription,
            lineCategory: 'Service',
        };
    }
    async buildPoLineCreates(tx, shopId, userId, items) {
        const resolved = [];
        for (const line of items) {
            resolved.push(await this.resolvePoLineProduct(tx, shopId, userId, line));
        }
        const productIds = resolved.map((line) => line.productId);
        const [products, summaries] = await Promise.all([
            tx.product.findMany({
                where: { id: { in: productIds } },
                select: {
                    id: true,
                    plants: {
                        where: { shopId, isActive: true },
                        select: { minStockLevel: true },
                        take: 1,
                    },
                },
            }),
            tx.stockSummary.findMany({
                where: { shopId, productId: { in: productIds } },
                select: { productId: true, currentStock: true },
            }),
        ]);
        const productMap = new Map(products.map((p) => [p.id, p]));
        const summaryMap = new Map(summaries.map((s) => [s.productId, s.currentStock]));
        let total = new client_1.Prisma.Decimal(0);
        const lines = [];
        for (let i = 0; i < items.length; i++) {
            const line = items[i];
            const meta = resolved[i];
            if (line.orderQty <= 0)
                throw new common_1.BadRequestException('Order qty must be > 0');
            if (line.rate <= 0)
                throw new common_1.BadRequestException('Rate must be > 0');
            const product = productMap.get(meta.productId);
            if (!product)
                throw new common_1.BadRequestException('Invalid product');
            const currentStock = summaryMap.get(meta.productId) ?? new client_1.Prisma.Decimal(0);
            const minStock = product.plants[0]?.minStockLevel ?? new client_1.Prisma.Decimal(0);
            const rawSuggested = minStock.mul(new client_1.Prisma.Decimal(2)).sub(currentStock);
            const suggested = rawSuggested.lt(0) ? new client_1.Prisma.Decimal(0) : rawSuggested;
            const lineValue = new client_1.Prisma.Decimal(line.orderQty).mul(new client_1.Prisma.Decimal(line.rate));
            total = total.add(lineValue);
            lines.push({
                productId: meta.productId,
                rfqItemId: line.rfqItemId ?? null,
                lineDescription: meta.lineDescription,
                lineCategory: meta.lineCategory,
                currentStock,
                minStock,
                suggestedQty: suggested,
                orderQty: new client_1.Prisma.Decimal(line.orderQty),
                rate: new client_1.Prisma.Decimal(line.rate),
                lineValue,
                createdById: userId,
            });
        }
        return { lines, total };
    }
    withLifecycle(po) {
        if (po.status === client_1.PurchaseOrderStatus.CANCELLED) {
            return { ...po, lifecycleStatus: 'CANCELLED', receiptProgress: [] };
        }
        if (po.status === client_1.PurchaseOrderStatus.DRAFT) {
            return { ...po, lifecycleStatus: 'DRAFT', receiptProgress: [] };
        }
        const postedReceipts = (po.goodsReceipts ?? []).filter((gr) => gr.status === 'POSTED');
        const receivedByProduct = new Map();
        for (const gr of postedReceipts) {
            for (const line of gr.items ?? []) {
                const curr = receivedByProduct.get(line.productId) ?? new client_1.Prisma.Decimal(0);
                const qty = line.quantity instanceof client_1.Prisma.Decimal ? line.quantity : new client_1.Prisma.Decimal(line.quantity);
                receivedByProduct.set(line.productId, curr.add(qty));
            }
        }
        const postedReturns = (po.supplierReturns ?? []).filter((ret) => ret.status === 'POSTED');
        for (const ret of postedReturns) {
            for (const line of ret.items ?? []) {
                const curr = receivedByProduct.get(line.productId) ?? new client_1.Prisma.Decimal(0);
                const qty = line.quantity instanceof client_1.Prisma.Decimal ? line.quantity : new client_1.Prisma.Decimal(line.quantity);
                const next = curr.sub(qty);
                receivedByProduct.set(line.productId, next.lt(0) ? new client_1.Prisma.Decimal(0) : next);
            }
        }
        const receiptProgress = po.items.map((line) => {
            const ordered = line.orderQty instanceof client_1.Prisma.Decimal ? line.orderQty : new client_1.Prisma.Decimal(line.orderQty);
            const receivedQty = receivedByProduct.get(line.productId) ?? new client_1.Prisma.Decimal(0);
            const remainingQty = ordered.sub(receivedQty);
            return {
                productId: line.productId,
                productCode: line.product?.productCode ?? null,
                orderedQty: ordered,
                receivedQty,
                remainingQty: remainingQty.lt(0) ? new client_1.Prisma.Decimal(0) : remainingQty,
            };
        });
        const hasAnyReceipt = receiptProgress.some((line) => line.receivedQty.gt(0));
        const fullyReceived = receiptProgress.every((line) => line.remainingQty.eq(0));
        const lifecycleStatus = fullyReceived
            ? 'FULLY_RECEIVED'
            : hasAnyReceipt
                ? 'PARTIALLY_RECEIVED'
                : 'CONFIRMED';
        return { ...po, lifecycleStatus, receiptProgress };
    }
    serialize(po) {
        const base = po;
        const receiptProgress = po.receiptProgress ?? [];
        return {
            id: base.id,
            poNumber: base.poNumber,
            poDate: base.poDate instanceof Date ? base.poDate.toISOString() : base.poDate,
            shopId: base.shopId,
            rfqId: base.rfqId ?? null,
            contractId: base.contractId,
            supplier: base.supplier,
            status: base.status,
            lifecycleStatus: base.lifecycleStatus,
            remarks: base.remarks ?? null,
            currency: base.currency,
            totalValue: base.totalValue == null ? null : Number(base.totalValue),
            createdAt: base.createdAt instanceof Date ? base.createdAt.toISOString() : base.createdAt,
            updatedAt: base.updatedAt instanceof Date ? base.updatedAt.toISOString() : base.updatedAt,
            shop: base.shop
                ? {
                    id: base.shop.id,
                    shopName: base.shop.shopName ?? base.shop.name,
                    shopNumber: base.shop.shopNumber ?? undefined,
                }
                : undefined,
            items: base.items.map((item) => ({
                id: item.id ?? `${item.productId}:${String(item.orderQty)}`,
                productId: item.productId,
                rfqItemId: item.rfqItemId ?? null,
                lineDescription: item.lineDescription ?? null,
                lineCategory: item.lineCategory ?? null,
                currentStock: Number(item.currentStock),
                minStock: Number(item.minStock),
                suggestedQty: Number(item.suggestedQty),
                orderQty: Number(item.orderQty),
                rate: Number(item.rate),
                lineValue: Number(item.lineValue),
                product: item.product
                    ? {
                        id: item.product.id,
                        productCode: item.product.productCode,
                        description: item.product.description,
                    }
                    : undefined,
            })),
            receiptProgress: receiptProgress.map((row) => ({
                productId: row.productId,
                productCode: row.productCode ?? undefined,
                orderedQty: Number(row.orderedQty),
                receivedQty: Number(row.receivedQty),
                remainingQty: Number(row.remainingQty),
            })),
        };
    }
    async list(user, query) {
        const take = (0, pagination_1.clampTake)(query.limit ?? query.take);
        const page = query.page && query.page > 0 ? query.page : 1;
        const skip = (page - 1) * take;
        const useCursor = Boolean(query.cursor);
        if (query.shop_id)
            (0, shop_scope_1.assertShopScope)(user, query.shop_id);
        const where = {
            shop: (0, shop_scope_1.shopListWhere)(user),
            ...(query.shop_id ? { shopId: query.shop_id } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.search?.trim()
                ? {
                    OR: [
                        { poNumber: { contains: query.search.trim(), mode: 'insensitive' } },
                        { supplier: { contains: query.search.trim(), mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const orderBy = useCursor
            ? { id: 'asc' }
            : [{ poDate: 'desc' }, { createdAt: 'desc' }];
        const findArgs = {
            where,
            orderBy,
            include: { items: ITEM_WITH_PRODUCT, goodsReceipts: RECEIPT_INCLUDE, supplierReturns: RETURN_INCLUDE },
            take: useCursor ? take + 1 : take,
            ...(useCursor
                ? {
                    cursor: query.cursor ? { id: query.cursor } : undefined,
                    skip: query.cursor ? 1 : undefined,
                }
                : { skip }),
        };
        const [rows, total] = await this.prisma.$transaction([
            this.prisma.purchaseOrderHeader.findMany(findArgs),
            this.prisma.purchaseOrderHeader.count({ where }),
        ]);
        const cursorMeta = (0, pagination_1.buildMeta)(rows, take);
        const items = useCursor ? cursorMeta.items : rows;
        const nextCursor = useCursor ? cursorMeta.meta.nextCursor : null;
        const totalPages = Math.max(1, Math.ceil(total / take));
        return {
            data: items.map((po) => this.serialize(this.withLifecycle(po))),
            meta: {
                nextCursor,
                limit: take,
                total,
                page,
                totalPages,
                hasMore: useCursor ? cursorMeta.meta.hasMore : page < totalPages,
            },
        };
    }
    async create(user, dto) {
        (0, shop_scope_1.assertShopScope)(user, dto.shopId);
        await (0, shop_access_1.verifyShopInTenant)(this.prisma, user, dto.shopId);
        const shop = await this.prisma.shop.findUnique({
            where: { id: dto.shopId },
            select: { companyId: true },
        });
        if (shop?.companyId) {
            await this.subscriptions.assertFeature(shop.companyId, 'purchase_orders');
        }
        const poDate = new Date(dto.poDate);
        (0, date_guards_1.assertNotFuture)(poDate, 'PO date');
        const idempotencyScope = this.idempotencyScope(user);
        const idempotencyCacheKey = this.createIdempotencyKey(dto.idempotencyKey);
        return this.prisma.$transaction(async (tx) => {
            const existing = await (0, idempotency_1.tryGetIdempotentResult)(tx, idempotencyCacheKey, idempotencyScope);
            if (existing?.poId) {
                const prior = await tx.purchaseOrderHeader.findUnique({
                    where: { id: existing.poId },
                    include: { items: ITEM_WITH_PRODUCT, shop: true },
                });
                if (prior)
                    return this.serialize(this.withLifecycle(prior));
            }
            if (dto.rfqId) {
                const missingRfqItem = dto.items.find((line) => !line.rfqItemId);
                if (missingRfqItem) {
                    throw new common_1.BadRequestException('rfqItemId is required on each line when rfqId is provided');
                }
                await this.rfqs.assertCanCreatePoFromRfq({
                    tx,
                    rfqId: dto.rfqId,
                    shopId: dto.shopId,
                    supplierName: dto.supplier,
                    items: dto.items.map((line) => ({
                        rfqItemId: line.rfqItemId,
                        orderQty: line.orderQty,
                    })),
                });
            }
            const manualNumber = dto.poNumber?.trim();
            if (manualNumber) {
                const exists = await tx.purchaseOrderHeader.findUnique({ where: { poNumber: manualNumber } });
                if (exists)
                    throw new common_1.BadRequestException('PO number already exists');
            }
            const { lines, total } = await this.buildPoLineCreates(tx, dto.shopId, user.id, dto.items);
            let created = null;
            const maxAttempts = manualNumber ? 1 : 3;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const poNumber = manualNumber ||
                    (await this.numbers.nextConfiguredShopScopedNumber(tx, {
                        shopId: dto.shopId,
                        docType: 'PO',
                        date: poDate,
                    }));
                try {
                    created = await tx.purchaseOrderHeader.create({
                        data: {
                            poNumber,
                            poDate,
                            shopId: dto.shopId,
                            rfqId: dto.rfqId ?? null,
                            contractId: dto.contractId ?? null,
                            supplier: dto.supplier.trim(),
                            remarks: dto.remarks?.trim(),
                            status: dto.confirmOnSend ? client_1.PurchaseOrderStatus.CONFIRMED : client_1.PurchaseOrderStatus.DRAFT,
                            totalValue: total,
                            createdById: user.id,
                            items: { create: lines },
                        },
                        include: { items: ITEM_WITH_PRODUCT, shop: true },
                    });
                    break;
                }
                catch (error) {
                    const canRetry = !manualNumber &&
                        attempt < maxAttempts &&
                        isUniqueViolationForFields(error, ['po_number', 'poNumber']);
                    if (canRetry)
                        continue;
                    throw error;
                }
            }
            if (!created) {
                throw new common_1.BadRequestException('Unable to reserve a unique PO number. Please retry.');
            }
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.CREATE,
                entityType: 'PURCHASE_ORDER',
                entityId: created.id,
                newValues: {
                    poNumber: created.poNumber,
                    shopId: created.shopId,
                    supplier: created.supplier,
                    rfqId: created.rfqId ?? null,
                    totalValue: created.totalValue?.toString() ?? null,
                    itemCount: created.items.length,
                    status: created.status,
                },
            }, tx);
            if (created.status === client_1.PurchaseOrderStatus.CONFIRMED) {
                await this.audit.log((0, document_audit_1.buildStatusTransitionAudit)({
                    companyId: (0, assert_company_id_1.assertCompanyId)(user),
                    userId: user.id,
                    entityType: 'PURCHASE_ORDER',
                    entityId: created.id,
                    fromStatus: client_1.PurchaseOrderStatus.DRAFT,
                    toStatus: client_1.PurchaseOrderStatus.CONFIRMED,
                    reason: dto.confirmOnSend ? 'confirmOnSend' : null,
                    action: client_1.AuditAction.POST,
                }), tx);
            }
            await (0, idempotency_1.trySetIdempotentResult)(tx, idempotencyCacheKey, { poId: created.id }, user.id, idempotencyScope);
            return this.serialize(this.withLifecycle(created));
        });
    }
    async get(user, id) {
        const po = await this.prisma.purchaseOrderHeader.findUnique({
            where: { id },
            include: {
                items: ITEM_WITH_PRODUCT,
                shop: { select: { id: true, shopName: true, shopNumber: true } },
                goodsReceipts: { ...RECEIPT_INCLUDE, orderBy: { grDate: 'asc' } },
                supplierReturns: RETURN_INCLUDE,
                supplierBills: { select: { id: true, status: true, totalValue: true, paidValue: true } },
            },
        });
        if (!po)
            throw new common_1.NotFoundException('Not found');
        await (0, shop_access_1.verifyShopInTenant)(this.prisma, user, po.shopId);
        return this.serialize(this.withLifecycle(po));
    }
    async update(user, id, dto) {
        const existing = await this.get(user, id);
        (0, assert_action_1.assertPoAction)(existing.status, document_actions_1.PurchaseOrderAction.EDIT);
        if (dto.shopId) {
            (0, shop_scope_1.assertShopScope)(user, dto.shopId);
            await (0, shop_access_1.verifyShopInTenant)(this.prisma, user, dto.shopId);
        }
        const expectedUpdatedAt = dto.ifUnmodifiedSince ? new Date(dto.ifUnmodifiedSince) : null;
        if (expectedUpdatedAt && Number.isNaN(expectedUpdatedAt.getTime())) {
            throw new common_1.BadRequestException('Invalid optimistic lock timestamp');
        }
        const nextRfqId = dto.rfqId ?? existing.rfqId ?? null;
        await this.assertPoMutationAllowed({ poId: id, action: 'update', existing, dto });
        const poDate = dto.poDate ? new Date(dto.poDate) : new Date(existing.poDate);
        (0, date_guards_1.assertNotFuture)(poDate, 'PO date');
        return this.prisma.$transaction(async (tx) => {
            if (expectedUpdatedAt) {
                const claimed = await tx.purchaseOrderHeader.updateMany({
                    where: { id, updatedAt: expectedUpdatedAt },
                    data: { updatedById: user.id },
                });
                if (claimed.count === 0) {
                    throw new common_1.ConflictException('Purchase order has been modified by another user. Refresh and try again.');
                }
            }
            const shopId = dto.shopId ?? existing.shopId;
            if (nextRfqId) {
                const validationLines = (dto.items ?? existing.items).map((line) => ({
                    rfqItemId: line.rfqItemId ?? undefined,
                    orderQty: Number(line.orderQty ?? 0),
                }));
                const missingRfqItem = validationLines.find((line) => !line.rfqItemId);
                if (missingRfqItem) {
                    throw new common_1.BadRequestException('rfqItemId is required on each line when rfqId is provided');
                }
                await this.rfqs.assertCanCreatePoFromRfq({
                    tx,
                    rfqId: nextRfqId,
                    shopId,
                    supplierName: dto.supplier ?? existing.supplier,
                    excludePoHeaderId: id,
                    items: validationLines.map((line) => ({
                        rfqItemId: line.rfqItemId,
                        orderQty: line.orderQty,
                    })),
                });
            }
            else if ((dto.items ?? []).some((line) => Boolean(line.rfqItemId))) {
                throw new common_1.BadRequestException('rfqItemId can only be used when rfqId is provided');
            }
            if (dto.items) {
                await tx.purchaseOrderItem.deleteMany({ where: { poHeaderId: id } });
                const { lines, total } = await this.buildPoLineCreates(tx, shopId, user.id, dto.items);
                await tx.purchaseOrderItem.createMany({
                    data: lines.map((line) => ({ ...line, poHeaderId: id })),
                });
                await tx.purchaseOrderHeader.update({ where: { id }, data: { totalValue: total } });
            }
            const updated = await tx.purchaseOrderHeader.update({
                where: { id },
                data: {
                    poDate,
                    shopId: dto.shopId ?? undefined,
                    rfqId: nextRfqId ?? undefined,
                    supplier: dto.supplier?.trim(),
                    remarks: dto.remarks?.trim(),
                    updatedById: user.id,
                },
                include: { items: ITEM_WITH_PRODUCT },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.UPDATE,
                entityType: 'PURCHASE_ORDER',
                entityId: updated.id,
                oldValues: {
                    poDate: existing.poDate,
                    shopId: existing.shopId,
                    rfqId: existing.rfqId ?? null,
                    supplier: existing.supplier,
                    remarks: existing.remarks ?? null,
                },
                newValues: {
                    poDate: updated.poDate.toISOString(),
                    shopId: updated.shopId,
                    rfqId: updated.rfqId ?? null,
                    supplier: updated.supplier,
                    remarks: updated.remarks ?? null,
                },
            });
            return this.serialize(this.withLifecycle(updated));
        });
    }
    async confirm(user, id, idempotencyKey) {
        const po = await this.get(user, id);
        if (po.status === client_1.PurchaseOrderStatus.CONFIRMED)
            return po;
        (0, assert_action_1.assertPoAction)(po.status, document_actions_1.PurchaseOrderAction.CONFIRM);
        (0, assert_transition_1.assertPoTransition)(po.status, client_1.PurchaseOrderStatus.CONFIRMED);
        const idempotencyScope = this.idempotencyScope(user);
        return this.prisma.$transaction(async (tx) => {
            const cacheKey = idempotencyKey ? `${id}:${idempotencyKey}` : undefined;
            const existing = await (0, idempotency_1.getIdempotentResult)(tx, cacheKey, idempotencyScope);
            if (existing?.poId) {
                const prior = await tx.purchaseOrderHeader.findUnique({
                    where: { id: existing.poId },
                    include: { items: ITEM_WITH_PRODUCT },
                });
                if (prior)
                    return this.serialize(this.withLifecycle(prior));
            }
            const transitioned = await tx.purchaseOrderHeader.updateMany({
                where: { id, status: client_1.PurchaseOrderStatus.DRAFT },
                data: { status: client_1.PurchaseOrderStatus.CONFIRMED, updatedById: user.id },
            });
            if (transitioned.count === 0) {
                throw new common_1.BadRequestException('Purchase order is not in DRAFT state');
            }
            const updated = await tx.purchaseOrderHeader.findUniqueOrThrow({
                where: { id },
                include: { items: ITEM_WITH_PRODUCT },
            });
            await this.audit.log((0, document_audit_1.buildStatusTransitionAudit)({
                companyId: (0, assert_company_id_1.assertCompanyId)(user),
                userId: user.id,
                entityType: 'PURCHASE_ORDER',
                entityId: updated.id,
                fromStatus: po.status,
                toStatus: updated.status,
                action: client_1.AuditAction.POST,
            }), tx);
            await (0, idempotency_1.setIdempotentResult)(tx, cacheKey, { poId: updated.id }, user.id, idempotencyScope);
            return this.serialize(this.withLifecycle(updated));
        });
    }
    async cancel(user, id, idempotencyKey) {
        const po = await this.get(user, id);
        if (po.status === client_1.PurchaseOrderStatus.CANCELLED)
            return po;
        (0, assert_action_1.assertPoAction)(po.status, document_actions_1.PurchaseOrderAction.CANCEL);
        (0, assert_transition_1.assertPoTransition)(po.status, client_1.PurchaseOrderStatus.CANCELLED);
        await this.assertPoMutationAllowed({ poId: id, action: 'cancel', existing: po });
        const hasPostedReceipt = (po.receiptProgress ?? []).some((line) => Number(line.receivedQty) > 0);
        if (hasPostedReceipt) {
            throw new common_1.BadRequestException('Cannot cancel a purchase order with posted goods receipts');
        }
        const idempotencyScope = this.idempotencyScope(user);
        return this.prisma.$transaction(async (tx) => {
            const cacheKey = idempotencyKey ? `${id}:${idempotencyKey}` : undefined;
            const existing = await (0, idempotency_1.getIdempotentResult)(tx, cacheKey, idempotencyScope);
            if (existing?.poId) {
                const prior = await tx.purchaseOrderHeader.findUnique({
                    where: { id: existing.poId },
                    include: { items: ITEM_WITH_PRODUCT },
                });
                if (prior)
                    return this.serialize(this.withLifecycle(prior));
            }
            const transitioned = await tx.purchaseOrderHeader.updateMany({
                where: {
                    id,
                    status: { in: [client_1.PurchaseOrderStatus.DRAFT, client_1.PurchaseOrderStatus.CONFIRMED] },
                },
                data: { status: client_1.PurchaseOrderStatus.CANCELLED, updatedById: user.id },
            });
            if (transitioned.count === 0) {
                throw new common_1.BadRequestException('Purchase order cannot be cancelled in its current state');
            }
            const updated = await tx.purchaseOrderHeader.findUniqueOrThrow({
                where: { id },
                include: { items: ITEM_WITH_PRODUCT },
            });
            await this.audit.log((0, document_audit_1.buildStatusTransitionAudit)({
                companyId: (0, assert_company_id_1.assertCompanyId)(user),
                userId: user.id,
                entityType: 'PURCHASE_ORDER',
                entityId: updated.id,
                fromStatus: po.status,
                toStatus: updated.status,
                reason: 'cancel',
            }), tx);
            await (0, idempotency_1.setIdempotentResult)(tx, cacheKey, { poId: updated.id }, user.id, idempotencyScope);
            return this.serialize(this.withLifecycle(updated));
        });
    }
    async printHtml(user, id) {
        return this.documentPdf.buildPurchaseOrderPrintHtml(user, id);
    }
    formatMoney(value) {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
    }
    buildPoEmailContent(po, companyName) {
        const poDate = po.poDate ? new Date(po.poDate) : new Date();
        const lines = po.items?.map((line) => ({
            code: line.product?.productCode ?? line.productId,
            description: line.product?.description ?? '',
            quantity: String(line.orderQty),
            uom: line.product?.description ? 'UNIT' : '',
            unitPrice: this.formatMoney(line.rate),
            lineValue: this.formatMoney(line.lineValue),
        })) ?? [];
        const totalValue = typeof po.totalValue === 'number'
            ? this.formatMoney(po.totalValue)
            : this.formatMoney(lines.reduce((acc, l) => acc + Number.parseFloat(l.lineValue.replace(/[^0-9.-]/g, '') || '0'), 0));
        return {
            supplierName: po.supplier,
            poNumber: po.poNumber,
            poDate: poDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            shopName: po.shop?.shopName ?? '',
            remarks: po.remarks ?? null,
            totalValue,
            companyName,
            lines,
        };
    }
    async assertCancelAllowed(user, poId) {
        const po = await this.get(user, poId);
        if (po.status === client_1.PurchaseOrderStatus.CANCELLED) {
            throw new common_1.BadRequestException('Purchase order is already cancelled');
        }
        (0, assert_action_1.assertPoAction)(po.status, document_actions_1.PurchaseOrderAction.CANCEL);
        await this.assertPoMutationAllowed({ poId, action: 'cancel', existing: po });
        return po;
    }
    async sendToSupplierSafe(user, id, options) {
        try {
            return await this.sendToSupplier(user, id, options);
        }
        catch (err) {
            const message = err instanceof common_1.BadRequestException
                ? err.message
                : err instanceof Error
                    ? err.message
                    : 'Email could not be queued';
            try {
                await this.audit.log((0, document_audit_1.buildDocumentActionAudit)({
                    companyId: (0, assert_company_id_1.assertCompanyId)(user),
                    userId: user.id,
                    entityType: 'PURCHASE_ORDER',
                    entityId: id,
                    action: options?.resend ? 'RESEND_PO' : 'SEND_PO',
                    result: 'failure',
                    detail: { message },
                }));
            }
            catch {
            }
            return {
                sent: false,
                queued: false,
                to: '',
                attachment: null,
                pdfAttached: false,
                emailStatus: 'failed',
                message,
            };
        }
    }
    async sendToSupplier(user, id, options) {
        const po = await this.get(user, id);
        (0, assert_action_1.assertPoAction)(po.status, document_actions_1.PurchaseOrderAction.SEND);
        const shopRow = await this.prisma.shop.findUnique({
            where: { id: po.shopId },
            select: { companyId: true, company: { select: { companyName: true } } },
        });
        if (!shopRow?.companyId) {
            throw new common_1.BadRequestException('Shop not linked to a company');
        }
        await this.subscriptions.assertFeature(shopRow.companyId, 'purchase_orders');
        const supplierName = po.supplier.trim();
        const supplier = await this.prisma.supplier.findFirst({
            where: {
                companyId: shopRow.companyId,
                supplierName: { equals: supplierName, mode: 'insensitive' },
            },
            select: { email: true, supplierName: true },
        });
        const email = supplier?.email?.trim();
        if (!email) {
            throw new common_1.BadRequestException(`Supplier email is missing for "${supplierName}". Open Suppliers, add an email to that supplier, and try again.`);
        }
        const content = this.buildPoEmailContent(po, shopRow.company?.companyName ?? 'Company');
        const defaults = (0, email_notifications_outbound_1.purchaseOrderDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(po.shopId, 'purchase_order_supplier', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled) {
            throw new common_1.BadRequestException('Purchase order email notifications are disabled in settings.');
        }
        const trigger = options?.resend ? client_2.DocumentEmailTrigger.RESEND : client_2.DocumentEmailTrigger.MANUAL;
        const result = await this.documentEmail.sendPurchaseOrderEmail(user, {
            poId: id,
            companyId: shopRow.companyId,
            shopId: po.shopId,
            recipient: email,
            content,
            prepared,
            documentNumber: po.poNumber,
            trigger,
        });
        await this.audit.log((0, document_audit_1.buildDocumentActionAudit)({
            companyId: (0, assert_company_id_1.assertCompanyId)(user),
            userId: user.id,
            entityType: 'PURCHASE_ORDER',
            entityId: id,
            action: options?.resend ? 'RESEND_PO' : 'SEND_PO',
            result: 'success',
            detail: {
                queued: result.queued ?? false,
                sent: result.sent ?? false,
                recipient: email,
            },
        }));
        return result;
    }
};
exports.PurchaseOrdersService = PurchaseOrdersService;
exports.PurchaseOrdersService = PurchaseOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        document_number_service_1.DocumentNumberService,
        audit_service_1.AuditService,
        subscription_service_1.SubscriptionService,
        rfqs_service_1.RfqsService,
        email_notifications_service_1.EmailNotificationsService,
        document_pdf_service_1.DocumentPdfService,
        document_email_service_1.DocumentEmailService])
], PurchaseOrdersService);
//# sourceMappingURL=purchase-orders.service.js.map