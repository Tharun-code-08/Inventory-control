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
exports.GoodsReceiptsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const notification_service_1 = require("../notifications/services/notification.service");
const Handlebars = require("handlebars");
const email_formatters_1 = require("../../common/mail/email-formatters");
const document_pdf_service_1 = require("../../common/pdf/document-pdf.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const assert_company_id_1 = require("../../common/utils/assert-company-id");
const shop_scope_1 = require("../../common/utils/shop-scope");
const pagination_1 = require("../../common/utils/pagination");
const date_guards_1 = require("../../common/utils/date-guards");
const document_number_service_1 = require("../stock/document-number.service");
const stock_service_1 = require("../stock/stock.service");
const costing_service_1 = require("../stock/costing.service");
const domain_exceptions_1 = require("../../common/exceptions/domain.exceptions");
const audit_service_1 = require("../audit/audit.service");
const serializable_tx_1 = require("../../common/utils/serializable-tx");
const idempotency_1 = require("../../common/utils/idempotency");
const email_notifications_service_1 = require("../email-notifications/email-notifications.service");
const email_notifications_outbound_1 = require("../email-notifications/email-notifications.outbound");
const document_email_service_1 = require("../document-email/document-email.service");
const assert_action_1 = require("../../common/state-machines/assert-action");
const assert_transition_1 = require("../../common/state-machines/assert-transition");
const document_actions_1 = require("../../common/state-machines/document-actions");
const document_audit_1 = require("../../common/state-machines/document-audit");
const inventory_audit_1 = require("../../common/state-machines/inventory-audit");
const procurement_downstream_1 = require("../../common/utils/procurement-downstream");
let GoodsReceiptsService = class GoodsReceiptsService {
    prisma;
    stock;
    numbers;
    audit;
    costing;
    emailNotifications;
    documentPdf;
    documentEmail;
    notifications;
    constructor(prisma, stock, numbers, audit, costing, emailNotifications, documentPdf, documentEmail, notifications) {
        this.prisma = prisma;
        this.stock = stock;
        this.numbers = numbers;
        this.audit = audit;
        this.costing = costing;
        this.emailNotifications = emailNotifications;
        this.documentPdf = documentPdf;
        this.documentEmail = documentEmail;
        this.notifications = notifications;
    }
    async assertStorageLocationsForShop(shopId, items) {
        for (const line of items) {
            const location = await this.prisma.storageLocation.findFirst({
                where: { id: line.storageLocationId, shopId, isActive: true },
            });
            if (!location) {
                throw new common_1.BadRequestException('Invalid storage location for this plant');
            }
        }
    }
    async validateAgainstPurchaseOrder(tx, headerId, purchaseOrderId, items) {
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtext(${'po:' + purchaseOrderId}::text))`;
        const po = await tx.purchaseOrderHeader.findUnique({
            where: { id: purchaseOrderId },
            include: { items: true },
        });
        if (!po) {
            throw new common_1.BadRequestException('Purchase order not found');
        }
        const poLifecycle = po.lifecycleStatus ?? po.status;
        if (poLifecycle !== 'CONFIRMED' && poLifecycle !== 'PARTIALLY_RECEIVED') {
            throw new common_1.BadRequestException('Goods receipt can be created only for CONFIRMED or PARTIALLY_RECEIVED purchase orders');
        }
        const postedReceipts = await tx.goodsReceiptHeader.findMany({
            where: {
                purchaseOrderId,
                status: client_1.DocumentStatus.POSTED,
                ...(headerId ? { id: { not: headerId } } : {}),
            },
            include: { items: true },
        });
        const alreadyReceivedByProduct = new Map();
        for (const gr of postedReceipts) {
            for (const line of gr.items) {
                const current = alreadyReceivedByProduct.get(line.productId) ?? new client_1.Prisma.Decimal(0);
                alreadyReceivedByProduct.set(line.productId, current.add(line.quantity));
            }
        }
        for (const line of items) {
            const poLine = po.items.find((x) => x.productId === line.productId);
            if (!poLine) {
                throw new common_1.BadRequestException('Received product does not belong to selected purchase order');
            }
            const already = alreadyReceivedByProduct.get(line.productId) ?? new client_1.Prisma.Decimal(0);
            const nextTotal = already.add(line.quantity);
            if (nextTotal.gt(poLine.orderQty)) {
                throw new common_1.BadRequestException(`Partial GR exceeds PO quantity for product ${line.productId}. Remaining qty: ${poLine.orderQty.sub(already).toString()}`);
            }
        }
    }
    async ensureProductPlantForReceipt(tx, user, params) {
        const existing = await tx.productPlant.findUnique({
            where: {
                productId_shopId: { productId: params.productId, shopId: params.shopId },
            },
        });
        if (existing) {
            if (!existing.storageLocationId && params.storageLocationId) {
                await tx.productPlant.update({
                    where: { id: existing.id },
                    data: {
                        storageLocationId: params.storageLocationId,
                        updatedById: user.id,
                    },
                });
            }
            return;
        }
        const template = await tx.productPlant.findFirst({
            where: { productId: params.productId },
            orderBy: { createdAt: 'asc' },
        });
        await tx.productPlant.create({
            data: {
                productId: params.productId,
                shopId: params.shopId,
                storageLocationId: params.storageLocationId,
                openingStock: new client_1.Prisma.Decimal(0),
                minStockLevel: template?.minStockLevel ?? new client_1.Prisma.Decimal(0),
                maxStockLevel: template?.maxStockLevel ?? null,
                reorderQty: template?.reorderQty ?? null,
                isActive: true,
                createdById: user.id,
            },
        });
    }
    async list(user, query) {
        const take = (0, pagination_1.clampTake)(query.take);
        if (query.shop_id)
            (0, shop_scope_1.assertShopScope)(user, query.shop_id);
        const where = {
            shop: (0, shop_scope_1.shopListWhere)(user),
            ...(query.shop_id ? { shopId: query.shop_id } : {}),
        };
        if (query.status)
            where.status = query.status;
        if (query.date_from || query.date_to) {
            where.grDate = {};
            if (query.date_from)
                where.grDate.gte = new Date(query.date_from);
            if (query.date_to)
                where.grDate.lte = new Date(query.date_to);
        }
        const rows = await this.prisma.goodsReceiptHeader.findMany({
            where,
            take: take + 1,
            ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
            orderBy: { createdAt: 'desc' },
            include: {
                shop: true,
                items: {
                    select: {
                        id: true,
                        productId: true,
                        quantity: true,
                        uom: true,
                        purchaseRate: true,
                        lineValue: true,
                        batchNumber: true,
                        serialNumber: true,
                        expiryDate: true,
                        storageLocationId: true,
                        product: {
                            select: {
                                id: true,
                                productCode: true,
                                description: true,
                            },
                        },
                    },
                },
            },
        });
        const { items, meta } = (0, pagination_1.buildMeta)(rows, take);
        const normalized = items.map((row) => {
            const computedTotal = row.items.reduce((sum, line) => sum.add(line.lineValue), new client_1.Prisma.Decimal(0));
            return {
                ...row,
                totalValue: row.totalValue ?? computedTotal,
            };
        });
        return { data: normalized, meta };
    }
    async create(user, dto) {
        (0, shop_scope_1.assertShopScope)(user, dto.shopId);
        const grDate = new Date(dto.grDate);
        (0, date_guards_1.assertNotFuture)(grDate);
        for (const line of dto.items) {
            if (line.quantity <= 0)
                throw new common_1.BadRequestException('Line quantities must be > 0');
            if (!line.storageLocationId) {
                throw new common_1.BadRequestException('Storage location is required on each line');
            }
        }
        await this.assertStorageLocationsForShop(dto.shopId, dto.items);
        const idempotencyScope = user.companyId
            ? `company:${user.companyId}`
            : user.shopId
                ? `shop:${user.shopId}`
                : 'global';
        const idempotencyCacheKey = dto.idempotencyKey?.trim()
            ? `gr:create:${dto.idempotencyKey.trim()}`
            : undefined;
        return (0, serializable_tx_1.runSerializableTxWithRetry)(this.prisma, async (tx) => {
            const existing = await (0, idempotency_1.tryGetIdempotentResult)(tx, idempotencyCacheKey, idempotencyScope);
            if (existing?.grId) {
                const prior = await tx.goodsReceiptHeader.findUnique({
                    where: { id: existing.grId },
                    include: { items: true, shop: true },
                });
                if (prior)
                    return prior;
            }
            const normalizedItems = dto.items.map((i) => ({
                productId: i.productId,
                quantity: new client_1.Prisma.Decimal(i.quantity),
            }));
            const resolvedReceiptSource = dto.receiptSource ?? (dto.purchaseOrderId ? 'PURCHASE_ORDER' : 'OUTSIDE');
            const resolvedPurchaseOrderId = resolvedReceiptSource === 'OUTSIDE' ? null : dto.purchaseOrderId ?? null;
            if (resolvedReceiptSource === 'PURCHASE_ORDER') {
                if (!resolvedPurchaseOrderId) {
                    throw new common_1.BadRequestException('Purchase order is required for PO-linked receipts');
                }
                await this.validateAgainstPurchaseOrder(tx, null, resolvedPurchaseOrderId, normalizedItems);
            }
            let grNumber = '';
            for (let attempt = 0; attempt < 50; attempt++) {
                grNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
                    shopId: dto.shopId,
                    docType: 'GR',
                    date: grDate,
                });
                const taken = await tx.goodsReceiptHeader.findUnique({
                    where: { grNumber },
                    select: { id: true },
                });
                if (!taken)
                    break;
                grNumber = '';
            }
            if (!grNumber) {
                throw new common_1.BadRequestException('Could not allocate a goods receipt number. Check the GR document series configuration.');
            }
            const header = await tx.goodsReceiptHeader.create({
                data: {
                    grNumber,
                    grDate,
                    shopId: dto.shopId,
                    purchaseOrderId: resolvedPurchaseOrderId,
                    receiptType: dto.receiptType,
                    receiptSource: resolvedReceiptSource,
                    inwardShift: dto.inwardShift ?? null,
                    supplierName: dto.supplierName.trim(),
                    supplierRef: dto.supplierRef?.trim(),
                    remarks: dto.remarks?.trim(),
                    status: client_1.DocumentStatus.DRAFT,
                    createdById: user.id,
                    items: {
                        create: dto.items.map((i) => ({
                            productId: i.productId,
                            quantity: new client_1.Prisma.Decimal(i.quantity),
                            uom: i.uom,
                            purchaseRate: new client_1.Prisma.Decimal(i.purchaseRate),
                            lineValue: new client_1.Prisma.Decimal(i.quantity).mul(new client_1.Prisma.Decimal(i.purchaseRate)),
                            batchNumber: i.batchNumber?.trim() || null,
                            serialNumber: i.serialNumber?.trim() || null,
                            expiryDate: i.expiryDate ? new Date(i.expiryDate) : null,
                            storageLocationId: i.storageLocationId ?? null,
                            createdById: user.id,
                        })),
                    },
                },
                include: { items: true, shop: true },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.CREATE,
                entityType: 'GOODS_RECEIPT',
                entityId: header.id,
                newValues: {
                    grNumber: header.grNumber,
                    supplierName: header.supplierName,
                    itemCount: dto.items.length,
                },
            }, tx);
            await (0, idempotency_1.trySetIdempotentResult)(tx, idempotencyCacheKey, { grId: header.id }, user.id, idempotencyScope);
            return header;
        });
    }
    async get(user, id) {
        const gr = await this.prisma.goodsReceiptHeader.findUnique({
            where: { id },
            include: { items: { include: { product: true, storageLocation: true } }, shop: true },
        });
        if (!gr)
            throw new common_1.NotFoundException('Goods receipt not found');
        (0, shop_scope_1.assertShopScope)(user, gr.shopId);
        return gr;
    }
    async update(user, id, dto) {
        const existing = await this.get(user, id);
        (0, assert_action_1.assertGrAction)(existing.status, document_actions_1.GrAction.EDIT);
        await (0, procurement_downstream_1.assertGrMutationAllowed)(this.prisma, { grId: id, action: 'update' });
        if (dto.shopId)
            (0, shop_scope_1.assertShopScope)(user, dto.shopId);
        const grDate = dto.grDate ? new Date(dto.grDate) : existing.grDate;
        (0, date_guards_1.assertNotFuture)(grDate);
        const resolvedShopId = dto.shopId ?? existing.shopId;
        if (dto.items) {
            for (const line of dto.items) {
                if (line.quantity <= 0)
                    throw new common_1.BadRequestException('Line quantities must be > 0');
                if (!line.storageLocationId) {
                    throw new common_1.BadRequestException('Storage location is required on each line');
                }
            }
            await this.assertStorageLocationsForShop(resolvedShopId, dto.items);
        }
        return (0, serializable_tx_1.runSerializableTxWithRetry)(this.prisma, async (tx) => {
            const resolvedReceiptSource = dto.receiptSource ??
                existing.receiptSource ??
                (dto.purchaseOrderId ?? existing.purchaseOrderId ? 'PURCHASE_ORDER' : 'OUTSIDE');
            const nextPoId = resolvedReceiptSource === 'OUTSIDE'
                ? null
                : dto.purchaseOrderId ?? existing.purchaseOrderId;
            const nextItems = dto.items ??
                existing.items.map((line) => ({
                    productId: line.productId,
                    quantity: Number(line.quantity),
                }));
            if (resolvedReceiptSource === 'PURCHASE_ORDER') {
                if (!nextPoId) {
                    throw new common_1.BadRequestException('Purchase order is required for PO-linked receipts');
                }
                if (dto.purchaseOrderId !== undefined || dto.items) {
                    await this.validateAgainstPurchaseOrder(tx, id, nextPoId, nextItems.map((line) => ({
                        productId: line.productId,
                        quantity: new client_1.Prisma.Decimal(line.quantity),
                    })));
                }
            }
            if (dto.items) {
                await tx.goodsReceiptItem.deleteMany({ where: { grHeaderId: id } });
            }
            return tx.goodsReceiptHeader.update({
                where: { id },
                data: {
                    grDate,
                    shopId: dto.shopId ?? undefined,
                    purchaseOrderId: nextPoId ?? undefined,
                    receiptType: dto.receiptType ?? undefined,
                    receiptSource: resolvedReceiptSource,
                    inwardShift: dto.inwardShift ?? undefined,
                    supplierName: dto.supplierName?.trim(),
                    supplierRef: dto.supplierRef?.trim(),
                    remarks: dto.remarks?.trim(),
                    updatedById: user.id,
                    ...(dto.items
                        ? {
                            items: {
                                create: dto.items.map((i) => ({
                                    productId: i.productId,
                                    quantity: new client_1.Prisma.Decimal(i.quantity),
                                    uom: i.uom,
                                    purchaseRate: new client_1.Prisma.Decimal(i.purchaseRate),
                                    lineValue: new client_1.Prisma.Decimal(i.quantity).mul(new client_1.Prisma.Decimal(i.purchaseRate)),
                                    batchNumber: i.batchNumber?.trim() || null,
                                    serialNumber: i.serialNumber?.trim() || null,
                                    expiryDate: i.expiryDate ? new Date(i.expiryDate) : null,
                                    storageLocationId: i.storageLocationId ?? null,
                                    createdById: user.id,
                                })),
                            },
                        }
                        : {}),
                },
                include: { items: true, shop: true },
            });
        });
    }
    async post(user, id) {
        const header = await this.get(user, id);
        if (header.status === client_1.DocumentStatus.POSTED) {
            throw new domain_exceptions_1.DocumentAlreadyPostedException();
        }
        (0, assert_action_1.assertGrAction)(header.status, document_actions_1.GrAction.POST);
        (0, assert_transition_1.assertGrTransition)(header.status, client_1.DocumentStatus.POSTED);
        const grDate = header.grDate;
        (0, date_guards_1.assertNotFuture)(grDate);
        return (0, serializable_tx_1.runSerializableTxWithRetry)(this.prisma, async (tx) => {
            const fresh = await tx.goodsReceiptHeader.findUnique({
                where: { id },
                include: { items: true },
            });
            if (!fresh || fresh.status !== client_1.DocumentStatus.DRAFT) {
                throw new domain_exceptions_1.DocumentAlreadyPostedException();
            }
            if (fresh.purchaseOrderId) {
                await this.validateAgainstPurchaseOrder(tx, fresh.id, fresh.purchaseOrderId, fresh.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
            }
            for (const line of fresh.items) {
                if (!line.storageLocationId) {
                    throw new common_1.BadRequestException('Storage location is required on each line before posting');
                }
                if (!line.expiryDate) {
                    throw new common_1.BadRequestException('Expiry date is required on each line before posting');
                }
                const location = await tx.storageLocation.findFirst({
                    where: { id: line.storageLocationId, shopId: fresh.shopId, isActive: true },
                });
                if (!location) {
                    throw new common_1.BadRequestException('Invalid storage location for this plant');
                }
            }
            const shop = await tx.shop.findUnique({
                where: { id: fresh.shopId },
                select: { costingMethod: true, companyId: true },
            });
            const method = shop?.costingMethod ?? client_1.CostingMethod.AVERAGE;
            const beforeQtyMap = new Map();
            for (const line of fresh.items) {
                const summary = await tx.stockSummary.findUnique({
                    where: { shopId_productId: { shopId: fresh.shopId, productId: line.productId } },
                });
                beforeQtyMap.set(line.productId, Number(summary?.currentStock ?? 0));
            }
            let total = new client_1.Prisma.Decimal(0);
            for (const line of fresh.items) {
                const beforeQty = beforeQtyMap.get(line.productId) ?? 0;
                await this.stock.postMovementOnce(tx, {
                    type: client_1.TransactionType.GOODS_RECEIPT,
                    ref: fresh.grNumber,
                    date: fresh.grDate,
                    shopId: fresh.shopId,
                    productId: line.productId,
                    inQty: Number(line.quantity),
                    outQty: 0,
                    unitRate: Number(line.purchaseRate),
                    sourceType: 'GOODS_RECEIPT',
                    sourceId: fresh.id,
                    sourceLineId: line.id,
                    idempotencyKey: `gr:${fresh.id}:${line.id}`,
                    userId: user.id,
                    remarks: [
                        line.batchNumber?.trim() ? `batch:${line.batchNumber.trim()}` : null,
                        line.serialNumber?.trim() ? `serial:${line.serialNumber.trim()}` : null,
                    ]
                        .filter(Boolean)
                        .join(' ') || undefined,
                });
                const afterSummary = await tx.stockSummary.findUnique({
                    where: { shopId_productId: { shopId: fresh.shopId, productId: line.productId } },
                });
                const afterQty = Number(afterSummary?.currentStock ?? 0);
                const delta = Number(line.quantity);
                await this.ensureProductPlantForReceipt(tx, user, {
                    productId: line.productId,
                    shopId: fresh.shopId,
                    storageLocationId: line.storageLocationId,
                });
                await this.costing.recordInflow(tx, {
                    shopId: fresh.shopId,
                    productId: line.productId,
                    qty: new client_1.Prisma.Decimal(line.quantity),
                    unitCost: new client_1.Prisma.Decimal(line.purchaseRate),
                    grId: fresh.id,
                    method,
                });
                if (shop?.companyId) {
                    await this.audit.log((0, inventory_audit_1.buildReceiveGoodsAudit)({
                        companyId: shop.companyId,
                        userId: user.id,
                        productId: line.productId,
                        warehouseId: fresh.shopId,
                        batchId: line.batchNumber?.trim(),
                        referenceNo: fresh.grNumber,
                        beforeQty,
                        delta,
                        afterQty,
                    }), tx);
                }
                total = total.add(line.lineValue);
            }
            const transitioned = await tx.goodsReceiptHeader.updateMany({
                where: { id, status: client_1.DocumentStatus.DRAFT },
                data: {
                    status: client_1.DocumentStatus.POSTED,
                    postedAt: new Date(),
                    totalValue: total,
                    updatedById: user.id,
                },
            });
            if (transitioned.count === 0) {
                throw new domain_exceptions_1.DocumentAlreadyPostedException();
            }
            const posted = await tx.goodsReceiptHeader.findUniqueOrThrow({
                where: { id },
                include: {
                    items: { include: { product: true, storageLocation: true } },
                    shop: true,
                    purchaseOrder: { select: { poNumber: true } },
                },
            });
            await this.audit.log((0, document_audit_1.buildStatusTransitionAudit)({
                companyId: (0, assert_company_id_1.assertCompanyId)(user),
                userId: user.id,
                entityType: 'GOODS_RECEIPT',
                entityId: posted.id,
                fromStatus: client_1.DocumentStatus.DRAFT,
                toStatus: client_1.DocumentStatus.POSTED,
                action: client_1.AuditAction.POST,
            }), tx);
            return posted;
        }).then(async (posted) => {
            let alertAttachments = [];
            try {
                const pdf = await this.documentPdf.renderGoodsReceiptPdfById(posted.id);
                alertAttachments = [{ filename: pdf.filename, content: pdf.buffer }];
            }
            catch {
            }
            await this.emailNotifications
                .sendInternalAlert({
                shopId: posted.shopId,
                alertKey: 'goodsReceiptPosted',
                title: `Goods receipt posted: ${posted.grNumber}`,
                message: `${posted.supplierName} — ${posted.shop?.shopName ?? posted.shopId}`,
                attachments: alertAttachments.length ? alertAttachments : undefined,
                dedupe: {
                    templateId: 'goods_receipt_posted',
                    entityType: 'goods-receipt',
                    entityId: posted.id,
                },
            })
                .catch(() => undefined);
            await this.autoSendGoodsReceiptEmail(user, posted).catch(() => undefined);
            const companyId = posted.shop?.companyId;
            if (companyId) {
                const poRef = posted.purchaseOrder?.poNumber
                    ? ` for ${posted.purchaseOrder.poNumber}`
                    : '';
                await this.notifications
                    .notifyRoles([client_1.RoleName.INVENTORY_MANAGER, client_1.RoleName.PURCHASE_MANAGER, client_1.RoleName.OWNER, client_1.RoleName.ADMIN], {
                    title: 'Goods Received',
                    message: `${posted.grNumber} has been posted${poRef}`,
                    type: client_1.AlertType.GOODS_RECEIPT_CREATED,
                    module: client_1.NotificationModule.GOODS_RECEIPT,
                    priority: client_1.NotificationPriority.NORMAL,
                    referenceType: 'goods_receipt',
                    referenceId: posted.id,
                    deepLink: `/goods-receipts/${posted.id}`,
                }, companyId, user.id)
                    .catch(() => undefined);
            }
            return posted;
        });
    }
    buildGoodsReceiptEmailContent(gr, companyName) {
        return {
            supplierName: gr.supplierName,
            grNumber: gr.grNumber,
            grDate: (0, email_formatters_1.formatEmailDate)(gr.grDate),
            shopName: gr.shop?.shopName ?? 'Plant',
            totalAmount: (0, email_formatters_1.formatEmailMoney)(gr.totalValue ?? 0),
            poNumber: gr.purchaseOrder?.poNumber ?? '—',
            companyName,
        };
    }
    async sendToSupplier(user, id, options) {
        const gr = await this.get(user, id);
        (0, assert_action_1.assertGrAction)(gr.status, document_actions_1.GrAction.SEND);
        const shopRow = await this.prisma.shop.findUnique({
            where: { id: gr.shopId },
            select: { companyId: true, company: { select: { companyName: true } } },
        });
        if (!shopRow?.companyId) {
            throw new common_1.BadRequestException('Shop not linked to a company');
        }
        const purchaseOrder = gr.purchaseOrderId
            ? await this.prisma.purchaseOrderHeader.findUnique({
                where: { id: gr.purchaseOrderId },
                select: { poNumber: true },
            })
            : null;
        const supplier = await this.prisma.supplier.findFirst({
            where: {
                companyId: shopRow.companyId,
                supplierName: { equals: gr.supplierName.trim(), mode: 'insensitive' },
            },
            select: { email: true, supplierName: true },
        });
        const email = supplier?.email?.trim();
        if (!email) {
            throw new common_1.BadRequestException(`Supplier email is missing for "${gr.supplierName}". Open Suppliers, add an email, and try again.`);
        }
        const content = this.buildGoodsReceiptEmailContent({ ...gr, purchaseOrder, shop: gr.shop }, shopRow.company?.companyName ?? 'Company');
        const defaults = (0, email_notifications_outbound_1.goodsReceiptSupplierDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(gr.shopId, 'goods_receipt_supplier', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled) {
            throw new common_1.BadRequestException('Goods receipt email notifications are disabled in settings.');
        }
        const trigger = options?.resend ? client_1.DocumentEmailTrigger.RESEND : client_1.DocumentEmailTrigger.MANUAL;
        return this.documentEmail.sendGoodsReceiptEmail(user, {
            grId: id,
            companyId: shopRow.companyId,
            shopId: gr.shopId,
            recipient: email,
            content,
            prepared,
            documentNumber: gr.grNumber,
            trigger,
        });
    }
    async autoSendGoodsReceiptEmail(user, gr) {
        const shopRow = await this.prisma.shop.findUnique({
            where: { id: gr.shopId },
            select: { companyId: true, company: { select: { companyName: true } } },
        });
        if (!shopRow?.companyId)
            return;
        const supplier = await this.prisma.supplier.findFirst({
            where: {
                companyId: shopRow.companyId,
                supplierName: { equals: gr.supplierName.trim(), mode: 'insensitive' },
            },
            select: { email: true },
        });
        const recipient = supplier?.email?.trim();
        if (!recipient)
            return;
        const content = this.buildGoodsReceiptEmailContent(gr, shopRow.company?.companyName ?? 'Company');
        const defaults = (0, email_notifications_outbound_1.goodsReceiptSupplierDefaults)(content);
        const prepared = await this.emailNotifications.prepareTemplateForShop(gr.shopId, 'goods_receipt_supplier', { subject: defaults.subject, text: defaults.text, html: defaults.html }, defaults.context);
        if (!prepared.enabled)
            return;
        await this.documentEmail.sendGoodsReceiptEmail(user, {
            grId: gr.id,
            companyId: shopRow.companyId,
            shopId: gr.shopId,
            recipient,
            content,
            prepared,
            documentNumber: gr.grNumber,
            trigger: client_1.DocumentEmailTrigger.AUTO,
        });
    }
    async print(user, id) {
        const gr = await this.get(user, id);
        const tpl = Handlebars.compile(`<!doctype html><html><head><meta charset="utf-8"><title>{{grNumber}}</title>
      <style>body{font-family:Arial;padding:24px} table{width:100%;border-collapse:collapse} td,th{border:1px solid #ccc;padding:8px}</style>
      </head><body>
      <h2>Goods Receipt {{grNumber}}</h2>
      <p>Date: {{grDate}} | Shop: {{shopName}}</p>
      <p>Supplier: {{supplierName}}</p>
      <table><thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Value</th></tr></thead><tbody>
      {{#each lines}}<tr><td>{{code}}</td><td>{{qty}}</td><td>{{rate}}</td><td>{{value}}</td></tr>{{/each}}
      </tbody></table>
      </body></html>`);
        return tpl({
            grNumber: gr.grNumber,
            grDate: gr.grDate.toISOString().slice(0, 10),
            shopName: gr.shop.shopName,
            supplierName: gr.supplierName,
            lines: gr.items.map((i) => ({
                code: i.product.productCode,
                qty: i.quantity.toString(),
                rate: i.purchaseRate.toString(),
                value: i.lineValue.toString(),
            })),
        });
    }
    async remove(user, id) {
        const existing = await this.get(user, id);
        (0, assert_action_1.assertGrAction)(existing.status, document_actions_1.GrAction.DELETE);
        await (0, procurement_downstream_1.assertGrMutationAllowed)(this.prisma, { grId: id, action: 'delete' });
        await this.prisma.goodsReceiptHeader.delete({ where: { id } });
        return { ok: true };
    }
};
exports.GoodsReceiptsService = GoodsReceiptsService;
exports.GoodsReceiptsService = GoodsReceiptsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stock_service_1.StockService,
        document_number_service_1.DocumentNumberService,
        audit_service_1.AuditService,
        costing_service_1.CostingService,
        email_notifications_service_1.EmailNotificationsService,
        document_pdf_service_1.DocumentPdfService,
        document_email_service_1.DocumentEmailService,
        notification_service_1.NotificationService])
], GoodsReceiptsService);
//# sourceMappingURL=goods-receipts.service.js.map