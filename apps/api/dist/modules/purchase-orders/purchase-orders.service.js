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
const Handlebars = require("handlebars");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const pagination_1 = require("../../common/utils/pagination");
const document_number_service_1 = require("../stock/document-number.service");
let PurchaseOrdersService = class PurchaseOrdersService {
    prisma;
    numbers;
    constructor(prisma, numbers) {
        this.prisma = prisma;
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
        const rows = await this.prisma.purchaseOrderHeader.findMany({
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
        const poDate = new Date(dto.poDate);
        this.assertNotFuture(poDate);
        return this.prisma.$transaction(async (tx) => {
            const poNumber = await this.numbers.nextNumber(tx, {
                shopId: dto.shopId,
                docType: 'PO',
                prefix: 'PO',
                date: poDate,
            });
            let total = new client_1.Prisma.Decimal(0);
            const lines = [];
            for (const line of dto.items) {
                if (line.orderQty <= 0)
                    throw new common_1.BadRequestException('Order qty must be > 0');
                const product = await tx.product.findUnique({ where: { id: line.productId } });
                if (!product || product.shopId !== dto.shopId)
                    throw new common_1.BadRequestException('Invalid product');
                const summary = await tx.stockSummary.findUnique({
                    where: { shopId_productId: { shopId: dto.shopId, productId: line.productId } },
                });
                const currentStock = summary?.currentStock ?? new client_1.Prisma.Decimal(0);
                const minStock = product.minStockLevel;
                const rawSuggested = minStock.mul(new client_1.Prisma.Decimal(2)).sub(currentStock);
                const suggested = rawSuggested.lt(0) ? new client_1.Prisma.Decimal(0) : rawSuggested;
                const lineValue = new client_1.Prisma.Decimal(line.orderQty).mul(new client_1.Prisma.Decimal(line.rate));
                total = total.add(lineValue);
                lines.push({
                    productId: line.productId,
                    currentStock,
                    minStock,
                    suggestedQty: suggested,
                    orderQty: new client_1.Prisma.Decimal(line.orderQty),
                    rate: new client_1.Prisma.Decimal(line.rate),
                    lineValue,
                    createdById: user.id,
                });
            }
            return tx.purchaseOrderHeader.create({
                data: {
                    poNumber,
                    poDate,
                    shopId: dto.shopId,
                    contractId: dto.contractId ?? null,
                    supplier: dto.supplier.trim(),
                    remarks: dto.remarks?.trim(),
                    status: client_1.PurchaseOrderStatus.DRAFT,
                    totalValue: total,
                    createdById: user.id,
                    items: { create: lines },
                },
                include: { items: { include: { product: true } }, shop: true },
            });
        });
    }
    async get(user, id) {
        const po = await this.prisma.purchaseOrderHeader.findUnique({
            where: { id },
            include: { items: { include: { product: true } }, shop: true },
        });
        if (!po)
            throw new common_1.NotFoundException('Not found');
        (0, shop_scope_1.assertShopScope)(user, po.shopId);
        return po;
    }
    async update(user, id, dto) {
        const existing = await this.get(user, id);
        if (existing.status !== client_1.PurchaseOrderStatus.DRAFT)
            throw new common_1.BadRequestException('Only DRAFT can be edited');
        if (dto.shopId)
            (0, shop_scope_1.assertShopScope)(user, dto.shopId);
        const poDate = dto.poDate ? new Date(dto.poDate) : existing.poDate;
        this.assertNotFuture(poDate);
        return this.prisma.$transaction(async (tx) => {
            if (dto.items) {
                await tx.purchaseOrderItem.deleteMany({ where: { poHeaderId: id } });
                let total = new client_1.Prisma.Decimal(0);
                const creates = [];
                for (const line of dto.items) {
                    if (line.orderQty <= 0)
                        throw new common_1.BadRequestException('Order qty must be > 0');
                    const shopId = dto.shopId ?? existing.shopId;
                    const product = await tx.product.findUnique({ where: { id: line.productId } });
                    if (!product || product.shopId !== shopId)
                        throw new common_1.BadRequestException('Invalid product');
                    const summary = await tx.stockSummary.findUnique({
                        where: { shopId_productId: { shopId, productId: line.productId } },
                    });
                    const currentStock = summary?.currentStock ?? new client_1.Prisma.Decimal(0);
                    const minStock = product.minStockLevel;
                    const rawSuggested = minStock.mul(new client_1.Prisma.Decimal(2)).sub(currentStock);
                    const suggested = rawSuggested.lt(0) ? new client_1.Prisma.Decimal(0) : rawSuggested;
                    const lineValue = new client_1.Prisma.Decimal(line.orderQty).mul(new client_1.Prisma.Decimal(line.rate));
                    total = total.add(lineValue);
                    creates.push({
                        poHeaderId: id,
                        productId: line.productId,
                        currentStock,
                        minStock,
                        suggestedQty: suggested,
                        orderQty: new client_1.Prisma.Decimal(line.orderQty),
                        rate: new client_1.Prisma.Decimal(line.rate),
                        lineValue,
                        createdById: user.id,
                    });
                }
                await tx.purchaseOrderItem.createMany({ data: creates });
                await tx.purchaseOrderHeader.update({ where: { id }, data: { totalValue: total } });
            }
            return tx.purchaseOrderHeader.update({
                where: { id },
                data: {
                    poDate,
                    shopId: dto.shopId ?? undefined,
                    supplier: dto.supplier?.trim(),
                    remarks: dto.remarks?.trim(),
                    updatedById: user.id,
                },
                include: { items: { include: { product: true } }, shop: true },
            });
        });
    }
    async confirm(user, id) {
        const po = await this.get(user, id);
        if (po.status !== client_1.PurchaseOrderStatus.DRAFT)
            throw new common_1.BadRequestException('Invalid status');
        return this.prisma.purchaseOrderHeader.update({
            where: { id },
            data: { status: client_1.PurchaseOrderStatus.CONFIRMED, updatedById: user.id },
            include: { items: { include: { product: true } }, shop: true },
        });
    }
    async cancel(user, id) {
        const po = await this.get(user, id);
        if (po.status === client_1.PurchaseOrderStatus.CANCELLED)
            throw new common_1.BadRequestException('Already cancelled');
        return this.prisma.purchaseOrderHeader.update({
            where: { id },
            data: { status: client_1.PurchaseOrderStatus.CANCELLED, updatedById: user.id },
            include: { items: { include: { product: true } }, shop: true },
        });
    }
    async printHtml(user, id) {
        const po = await this.get(user, id);
        const tpl = Handlebars.compile(`<!doctype html><html><head><meta charset="utf-8"><title>{{no}}</title>
      <style>body{font-family:Arial;padding:24px} table{width:100%;border-collapse:collapse} td,th{border:1px solid #ccc;padding:8px}</style>
      </head><body>
      <h2>Purchase Order {{no}}</h2>
      <p>Date: {{d}} | Shop: {{shop}} | Supplier: {{supplier}}</p>
      <table><thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Value</th></tr></thead><tbody>
      {{#each lines}}<tr><td>{{code}}</td><td>{{qty}}</td><td>{{rate}}</td><td>{{value}}</td></tr>{{/each}}
      </tbody></table>
      </body></html>`);
        return tpl({
            no: po.poNumber,
            d: po.poDate.toISOString().slice(0, 10),
            shop: po.shop.shopName,
            supplier: po.supplier,
            lines: po.items.map((i) => ({
                code: i.product.productCode,
                qty: i.orderQty.toString(),
                rate: i.rate.toString(),
                value: i.lineValue.toString(),
            })),
        });
    }
};
exports.PurchaseOrdersService = PurchaseOrdersService;
exports.PurchaseOrdersService = PurchaseOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        document_number_service_1.DocumentNumberService])
], PurchaseOrdersService);
//# sourceMappingURL=purchase-orders.service.js.map