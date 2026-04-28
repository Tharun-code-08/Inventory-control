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
const Handlebars = require("handlebars");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const pagination_1 = require("../../common/utils/pagination");
const document_number_service_1 = require("../stock/document-number.service");
const stock_service_1 = require("../stock/stock.service");
const domain_exceptions_1 = require("../../common/exceptions/domain.exceptions");
let GoodsReceiptsService = class GoodsReceiptsService {
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
            orderBy: { id: 'asc' },
            include: { shop: true },
        });
        const { items, meta } = (0, pagination_1.buildMeta)(rows, take);
        return { data: items, meta };
    }
    async create(user, dto) {
        (0, shop_scope_1.assertShopScope)(user, dto.shopId);
        const grDate = new Date(dto.grDate);
        this.assertNotFuture(grDate);
        for (const line of dto.items) {
            if (line.quantity <= 0)
                throw new common_1.BadRequestException('Line quantities must be > 0');
        }
        return this.prisma.$transaction(async (tx) => {
            const grNumber = await this.numbers.nextNumber(tx, {
                shopId: dto.shopId,
                docType: 'GR',
                prefix: 'GR',
                date: grDate,
            });
            const header = await tx.goodsReceiptHeader.create({
                data: {
                    grNumber,
                    grDate,
                    shopId: dto.shopId,
                    purchaseOrderId: dto.purchaseOrderId ?? null,
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
                            createdById: user.id,
                        })),
                    },
                },
                include: { items: true, shop: true },
            });
            return header;
        });
    }
    async get(user, id) {
        const gr = await this.prisma.goodsReceiptHeader.findUnique({
            where: { id },
            include: { items: { include: { product: true } }, shop: true },
        });
        if (!gr)
            throw new common_1.NotFoundException('Goods receipt not found');
        (0, shop_scope_1.assertShopScope)(user, gr.shopId);
        return gr;
    }
    async update(user, id, dto) {
        const existing = await this.get(user, id);
        if (existing.status !== client_1.DocumentStatus.DRAFT) {
            throw new common_1.BadRequestException('Only DRAFT goods receipts can be edited');
        }
        if (dto.shopId)
            (0, shop_scope_1.assertShopScope)(user, dto.shopId);
        const grDate = dto.grDate ? new Date(dto.grDate) : existing.grDate;
        this.assertNotFuture(grDate);
        return this.prisma.$transaction(async (tx) => {
            if (dto.items) {
                await tx.goodsReceiptItem.deleteMany({ where: { grHeaderId: id } });
                for (const line of dto.items) {
                    if (line.quantity <= 0)
                        throw new common_1.BadRequestException('Line quantities must be > 0');
                }
            }
            return tx.goodsReceiptHeader.update({
                where: { id },
                data: {
                    grDate,
                    shopId: dto.shopId ?? undefined,
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
        const grDate = header.grDate;
        this.assertNotFuture(grDate);
        return this.prisma.$transaction(async (tx) => {
            const fresh = await tx.goodsReceiptHeader.findUnique({
                where: { id },
                include: { items: true },
            });
            if (!fresh || fresh.status !== client_1.DocumentStatus.DRAFT) {
                throw new domain_exceptions_1.DocumentAlreadyPostedException();
            }
            let total = new client_1.Prisma.Decimal(0);
            for (const line of fresh.items) {
                await this.stock.postMovement(tx, {
                    type: client_1.TransactionType.GOODS_RECEIPT,
                    ref: fresh.grNumber,
                    date: fresh.grDate,
                    shopId: fresh.shopId,
                    productId: line.productId,
                    inQty: Number(line.quantity),
                    outQty: 0,
                    unitRate: Number(line.purchaseRate),
                    userId: user.id,
                });
                total = total.add(line.lineValue);
            }
            return tx.goodsReceiptHeader.update({
                where: { id },
                data: {
                    status: client_1.DocumentStatus.POSTED,
                    postedAt: new Date(),
                    totalValue: total,
                    updatedById: user.id,
                },
                include: { items: { include: { product: true } }, shop: true },
            });
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
        if (existing.status !== client_1.DocumentStatus.DRAFT) {
            throw new common_1.BadRequestException('Only DRAFT goods receipts can be deleted');
        }
        await this.prisma.goodsReceiptHeader.delete({ where: { id } });
        return { ok: true };
    }
};
exports.GoodsReceiptsService = GoodsReceiptsService;
exports.GoodsReceiptsService = GoodsReceiptsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stock_service_1.StockService,
        document_number_service_1.DocumentNumberService])
], GoodsReceiptsService);
//# sourceMappingURL=goods-receipts.service.js.map