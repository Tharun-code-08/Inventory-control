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
const Handlebars = require("handlebars");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const pagination_1 = require("../../common/utils/pagination");
const document_number_service_1 = require("../stock/document-number.service");
const stock_service_1 = require("../stock/stock.service");
const domain_exceptions_1 = require("../../common/exceptions/domain.exceptions");
let GoodsIssuesService = class GoodsIssuesService {
    prisma;
    stock;
    numbers;
    constructor(prisma, stock, numbers) {
        this.prisma = prisma;
        this.stock = stock;
        this.numbers = numbers;
    }
    assertNotFuture(date) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (date.getTime() > today.getTime()) {
            throw new common_1.BadRequestException('Document date cannot be in the future');
        }
    }
    async available(tx, shopId, productId) {
        const s = await tx.stockSummary.findUnique({
            where: { shopId_productId: { shopId, productId } },
        });
        return s?.currentStock ?? new client_1.Prisma.Decimal(0);
    }
    async list(user, query) {
        const take = (0, pagination_1.clampTake)(query.take);
        const shopScope = (0, shop_scope_1.defaultShopFilter)(user);
        const shopId = shopScope ?? query.shop_id;
        if (query.shop_id)
            (0, shop_scope_1.assertShopScope)(user, query.shop_id);
        const where = {};
        if (shopId)
            where.shopId = shopId;
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
            orderBy: { id: 'asc' },
            include: { shop: true },
        });
        const { items, meta } = (0, pagination_1.buildMeta)(rows, take);
        return { data: items, meta };
    }
    async create(user, params) {
        (0, shop_scope_1.assertShopScope)(user, params.shopId);
        const giDate = new Date(params.giDate);
        this.assertNotFuture(giDate);
        for (const line of params.items) {
            if (line.quantity <= 0)
                throw new common_1.BadRequestException('Line quantities must be > 0');
        }
        return this.prisma.$transaction(async (tx) => {
            const giNumber = await this.numbers.nextNumber(tx, {
                shopId: params.shopId,
                docType: 'GI',
                prefix: 'GI',
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
                    issueReason: params.issueReason.trim(),
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
        this.assertNotFuture(giDate);
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
                    issueReason: dto.issueReason?.trim(),
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
        this.assertNotFuture(header.giDate);
        return this.prisma.$transaction(async (tx) => {
            const fresh = await tx.goodsIssueHeader.findUnique({ where: { id }, include: { items: true } });
            if (!fresh || fresh.status !== client_1.DocumentStatus.DRAFT)
                throw new domain_exceptions_1.DocumentAlreadyPostedException();
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
            for (const line of fresh.items) {
                await this.stock.postMovement(tx, {
                    type: client_1.TransactionType.GOODS_ISSUE,
                    ref: fresh.giNumber,
                    date: fresh.giDate,
                    shopId: fresh.shopId,
                    productId: line.productId,
                    inQty: 0,
                    outQty: Number(line.quantity),
                    userId: user.id,
                });
            }
            return tx.goodsIssueHeader.update({
                where: { id },
                data: { status: client_1.DocumentStatus.POSTED, postedAt: new Date(), updatedById: user.id },
                include: { items: { include: { product: true } }, shop: true },
            });
        });
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
        document_number_service_1.DocumentNumberService])
], GoodsIssuesService);
//# sourceMappingURL=goods-issues.service.js.map