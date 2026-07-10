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
exports.GoodsIssuesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const notification_service_1 = require("../notifications/services/notification.service");
const Handlebars = require("handlebars");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const pagination_1 = require("../../common/utils/pagination");
const date_guards_1 = require("../../common/utils/date-guards");
const document_number_service_1 = require("../stock/document-number.service");
const stock_service_1 = require("../stock/stock.service");
const inventory_lot_service_1 = require("../stock/inventory-lot.service");
const domain_exceptions_1 = require("../../common/exceptions/domain.exceptions");
const audit_service_1 = require("../audit/audit.service");
let GoodsIssuesService = class GoodsIssuesService {
    prisma;
    stock;
    numbers;
    audit;
    inventoryLots;
    notifications;
    constructor(prisma, stock, numbers, audit, inventoryLots, notifications) {
        this.prisma = prisma;
        this.stock = stock;
        this.numbers = numbers;
        this.audit = audit;
        this.inventoryLots = inventoryLots;
        this.notifications = notifications;
    }
    serializeListRow(row) {
        return {
            id: row.id,
            giNumber: row.giNumber,
            giDate: row.giDate.toISOString().slice(0, 10),
            shopId: row.shopId,
            issueReason: row.issueReason,
            issueType: row.issueType ?? row.issueReason,
            otherReason: row.otherReason ?? null,
            remarks: row.remarks,
            status: row.status,
            postedAt: row.postedAt?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
            itemCount: row._count.items,
            shop: row.shop
                ? {
                    id: row.shop.id,
                    shopName: row.shop.shopName,
                    shopNumber: row.shop.shopNumber,
                }
                : undefined,
        };
    }
    async available(tx, shopId, productId) {
        return this.stock.resolveBalance(tx, shopId, productId);
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
            where.giDate = {};
            if (query.date_from)
                where.giDate.gte = new Date(query.date_from);
            if (query.date_to)
                where.giDate.lte = new Date(query.date_to);
        }
        const rows = await this.prisma.goodsIssueHeader.findMany({
            where,
            take: take + 1,
            ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            include: {
                shop: true,
                _count: { select: { items: true } },
            },
        });
        const { items, meta } = (0, pagination_1.buildMeta)(rows, take);
        return { data: items.map((row) => this.serializeListRow(row)), meta };
    }
    async create(user, params) {
        (0, shop_scope_1.assertShopScope)(user, params.shopId);
        const giDate = new Date(params.giDate);
        (0, date_guards_1.assertNotFuture)(giDate);
        for (const line of params.items) {
            if (line.quantity <= 0)
                throw new common_1.BadRequestException('Line quantities must be > 0');
        }
        const issueType = params.issueType?.trim() || params.issueReason?.trim();
        if (!issueType) {
            throw new common_1.BadRequestException('Issue type is required');
        }
        if (issueType === 'Others' && !params.otherReason?.trim()) {
            throw new common_1.BadRequestException('Please provide a reason for Others');
        }
        return this.prisma.$transaction(async (tx) => {
            const giNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
                shopId: params.shopId,
                docType: 'GI',
                date: giDate,
            });
            const lines = [];
            for (const line of params.items) {
                const avail = await this.available(tx, params.shopId, line.productId);
                if (avail.lt(new client_1.Prisma.Decimal(line.quantity))) {
                    const product = await tx.product.findUnique({ where: { id: line.productId } });
                    throw new domain_exceptions_1.InsufficientStockException('Insufficient stock at creation', [
                        {
                            productId: line.productId,
                            productCode: product?.productCode ?? line.productId,
                            available: avail.toString(),
                            requested: String(line.quantity),
                        },
                    ]);
                }
                lines.push({
                    productId: line.productId,
                    quantity: new client_1.Prisma.Decimal(line.quantity),
                    uom: line.uom,
                    availableStockSnapshot: avail,
                    createdById: user.id,
                });
            }
            return tx.goodsIssueHeader.create({
                data: {
                    giNumber,
                    giDate,
                    shopId: params.shopId,
                    issueType,
                    issueReason: issueType,
                    otherReason: params.otherReason?.trim() || null,
                    remarks: params.remarks?.trim(),
                    status: client_1.DocumentStatus.DRAFT,
                    createdById: user.id,
                    items: { create: lines },
                },
                include: { items: { include: { product: true } }, shop: true },
            });
        });
    }
    async get(user, id) {
        const gi = await this.prisma.goodsIssueHeader.findUnique({
            where: { id },
            include: { items: { include: { product: true } }, shop: true },
        });
        if (!gi)
            throw new common_1.NotFoundException('Goods issue not found');
        (0, shop_scope_1.assertShopScope)(user, gi.shopId);
        return gi;
    }
    async update(user, id, dto) {
        const existing = await this.get(user, id);
        if (existing.status !== client_1.DocumentStatus.DRAFT)
            throw new common_1.BadRequestException('Only DRAFT can be edited');
        if (dto.shopId)
            (0, shop_scope_1.assertShopScope)(user, dto.shopId);
        const giDate = dto.giDate ? new Date(dto.giDate) : existing.giDate;
        (0, date_guards_1.assertNotFuture)(giDate);
        const nextIssueType = dto.issueType?.trim() || dto.issueReason?.trim() || existing.issueType || existing.issueReason;
        const nextOtherReason = dto.otherReason?.trim() ?? existing.otherReason;
        if (!nextIssueType) {
            throw new common_1.BadRequestException('Issue type is required');
        }
        if (nextIssueType === 'Others' && !nextOtherReason) {
            throw new common_1.BadRequestException('Please provide a reason for Others');
        }
        return this.prisma.$transaction(async (tx) => {
            if (dto.items) {
                await tx.goodsIssueItem.deleteMany({ where: { giHeaderId: id } });
                const creates = [];
                for (const line of dto.items) {
                    if (line.quantity <= 0)
                        throw new common_1.BadRequestException('Line quantities must be > 0');
                    const avail = await this.available(tx, dto.shopId ?? existing.shopId, line.productId);
                    if (avail.lt(new client_1.Prisma.Decimal(line.quantity))) {
                        throw new domain_exceptions_1.InsufficientStockException('Insufficient stock', [
                            {
                                productId: line.productId,
                                productCode: line.productId,
                                available: avail.toString(),
                                requested: String(line.quantity),
                            },
                        ]);
                    }
                    creates.push({
                        productId: line.productId,
                        quantity: new client_1.Prisma.Decimal(line.quantity),
                        uom: line.uom,
                        availableStockSnapshot: avail,
                        createdById: user.id,
                    });
                }
                await tx.goodsIssueItem.createMany({ data: creates.map((c) => ({ ...c, giHeaderId: id })) });
            }
            return tx.goodsIssueHeader.update({
                where: { id },
                data: {
                    giDate,
                    shopId: dto.shopId ?? undefined,
                    issueType: nextIssueType,
                    issueReason: nextIssueType,
                    otherReason: nextOtherReason ?? null,
                    remarks: dto.remarks?.trim(),
                    updatedById: user.id,
                },
                include: { items: { include: { product: true } }, shop: true },
            });
        });
    }
    async post(user, id) {
        const header = await this.get(user, id);
        if (header.status === client_1.DocumentStatus.POSTED)
            throw new domain_exceptions_1.DocumentAlreadyPostedException();
        (0, date_guards_1.assertNotFuture)(header.giDate);
        const { posted, beforeStock } = await this.prisma.$transaction(async (tx) => {
            const fresh = await tx.goodsIssueHeader.findUnique({ where: { id }, include: { items: true } });
            if (!fresh || fresh.status !== client_1.DocumentStatus.DRAFT)
                throw new domain_exceptions_1.DocumentAlreadyPostedException();
            const beforeStock = new Map();
            for (const line of fresh.items) {
                const summary = await tx.stockSummary.findUnique({
                    where: { shopId_productId: { shopId: fresh.shopId, productId: line.productId } },
                });
                beforeStock.set(line.productId, Number(summary?.currentStock ?? 0));
            }
            const failures = [];
            for (const line of fresh.items) {
                const avail = await this.available(tx, fresh.shopId, line.productId);
                if (avail.lt(line.quantity)) {
                    const product = await tx.product.findUnique({ where: { id: line.productId } });
                    failures.push({
                        productId: line.productId,
                        productCode: product?.productCode ?? line.productId,
                        available: avail.toString(),
                        requested: line.quantity.toString(),
                    });
                }
            }
            if (failures.length) {
                throw new domain_exceptions_1.InsufficientStockException('Insufficient stock for posting', failures);
            }
            const transitioned = await tx.goodsIssueHeader.updateMany({
                where: { id, status: client_1.DocumentStatus.DRAFT },
                data: { status: client_1.DocumentStatus.POSTED, postedAt: new Date(), updatedById: user.id },
            });
            if (transitioned.count === 0) {
                throw new domain_exceptions_1.DocumentAlreadyPostedException();
            }
            for (const line of fresh.items) {
                await this.stock.postMovementOnce(tx, {
                    type: client_1.TransactionType.GOODS_ISSUE,
                    ref: fresh.giNumber,
                    date: fresh.giDate,
                    shopId: fresh.shopId,
                    productId: line.productId,
                    inQty: 0,
                    outQty: line.quantity,
                    sourceType: 'GOODS_ISSUE',
                    sourceId: fresh.id,
                    sourceLineId: line.id,
                    idempotencyKey: `gi:${fresh.id}:${line.id}`,
                    userId: user.id,
                });
                await this.inventoryLots.consumeFifo(tx, fresh.shopId, line.productId, new client_1.Prisma.Decimal(line.quantity));
            }
            const posted = await tx.goodsIssueHeader.findUniqueOrThrow({
                where: { id },
                include: { items: { include: { product: true } }, shop: true },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.POST,
                entityType: 'GOODS_ISSUE',
                entityId: posted.id,
                newValues: {
                    giNumber: posted.giNumber,
                    status: posted.status,
                    itemCount: posted.items.length,
                },
            }, tx);
            return { posted, beforeStock };
        });
        const companyId = posted.shop?.companyId;
        if (companyId) {
            for (const line of posted.items) {
                try {
                    const [plant, summary] = await Promise.all([
                        this.prisma.productPlant.findUnique({
                            where: { productId_shopId: { productId: line.productId, shopId: posted.shopId } },
                            select: { minStockLevel: true },
                        }),
                        this.prisma.stockSummary.findUnique({
                            where: { shopId_productId: { shopId: posted.shopId, productId: line.productId } },
                            select: { currentStock: true },
                        }),
                    ]);
                    const min = Number(plant?.minStockLevel ?? 0);
                    if (min <= 0)
                        continue;
                    const before = beforeStock.get(line.productId) ?? 0;
                    const after = Number(summary?.currentStock ?? 0);
                    if (before > min && after <= min) {
                        const critical = after <= 0;
                        await this.notifications.notifyRoles([client_1.RoleName.INVENTORY_MANAGER, client_1.RoleName.PURCHASE_MANAGER, client_1.RoleName.OWNER, client_1.RoleName.ADMIN], {
                            title: critical ? 'Critical Stock Alert' : 'Low Stock Alert',
                            message: `${line.product.description} is ${critical ? 'out of stock' : 'below minimum stock level'}`,
                            type: critical ? client_1.AlertType.CRITICAL_STOCK : client_1.AlertType.LOW_STOCK,
                            module: client_1.NotificationModule.INVENTORY,
                            priority: critical ? client_1.NotificationPriority.CRITICAL : client_1.NotificationPriority.HIGH,
                            referenceType: 'product',
                            referenceId: line.productId,
                            deepLink: `/products/${line.productId}`,
                        }, companyId, user.id);
                    }
                }
                catch {
                }
            }
        }
        return posted;
    }
    async print(user, id) {
        const gi = await this.get(user, id);
        const tpl = Handlebars.compile(`<!doctype html><html><head><meta charset="utf-8"><title>{{giNumber}}</title>
      <style>body{font-family:Arial;padding:24px} table{width:100%;border-collapse:collapse} td,th{border:1px solid #ccc;padding:8px}</style>
      </head><body>
      <h2>Goods Issue {{giNumber}}</h2>
      <p>Date: {{giDate}} | Shop: {{shopName}}</p>
      <p>Reason: {{issueReason}}</p>
      <table><thead><tr><th>Product</th><th>Qty</th></tr></thead><tbody>
      {{#each lines}}<tr><td>{{code}}</td><td>{{qty}}</td></tr>{{/each}}
      </tbody></table>
      </body></html>`);
        return tpl({
            giNumber: gi.giNumber,
            giDate: gi.giDate.toISOString().slice(0, 10),
            shopName: gi.shop.shopName,
            issueReason: gi.issueReason,
            lines: gi.items.map((i) => ({ code: i.product.productCode, qty: i.quantity.toString() })),
        });
    }
    async remove(user, id) {
        const existing = await this.get(user, id);
        if (existing.status !== client_1.DocumentStatus.DRAFT)
            throw new common_1.BadRequestException('Only DRAFT can be deleted');
        await this.prisma.goodsIssueHeader.delete({ where: { id } });
        return { ok: true };
    }
};
exports.GoodsIssuesService = GoodsIssuesService;
exports.GoodsIssuesService = GoodsIssuesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stock_service_1.StockService,
        document_number_service_1.DocumentNumberService,
        audit_service_1.AuditService,
        inventory_lot_service_1.InventoryLotService,
        notification_service_1.NotificationService])
], GoodsIssuesService);
//# sourceMappingURL=goods-issues.service.js.map