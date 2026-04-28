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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const pagination_1 = require("../../common/utils/pagination");
const stock_service_1 = require("../stock/stock.service");
let ProductsService = class ProductsService {
    prisma;
    stock;
    constructor(prisma, stock) {
        this.prisma = prisma;
        this.stock = stock;
    }
    async list(user, query) {
        const limit = (0, pagination_1.clampTake)(query.limit);
        const page = query.page && query.page > 0 ? query.page : 1;
        const skip = (page - 1) * limit;
        const shopScope = (0, shop_scope_1.defaultShopFilter)(user);
        const shopId = shopScope ?? query.shop_id;
        if (query.shop_id)
            (0, shop_scope_1.assertShopScope)(user, query.shop_id);
        const where = {
            ...(shopId ? { shopId } : {}),
            ...(query.category ? { category: query.category } : {}),
            ...(query.is_active !== undefined ? { isActive: query.is_active } : {}),
            ...(query.search?.trim()
                ? {
                    OR: [
                        { productCode: { contains: query.search.trim(), mode: 'insensitive' } },
                        { description: { contains: query.search.trim(), mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [products, total] = await this.prisma.$transaction([
            this.prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { shop: true, stockSummaries: { select: { currentStock: true }, take: 1 } },
            }),
            this.prisma.product.count({ where }),
        ]);
        return {
            data: products.map((product) => {
                const { stockSummaries, ...rest } = product;
                return {
                    ...rest,
                    currentStock: stockSummaries[0] != null ? Number(stockSummaries[0].currentStock) : undefined,
                };
            }),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        };
    }
    async create(user, dto) {
        (0, shop_scope_1.assertShopScope)(user, dto.shopId);
        if (dto.sellingPrice < dto.purchasePrice) {
        }
        return this.prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    productCode: dto.productCode,
                    description: dto.description,
                    uom: dto.uom,
                    shopId: dto.shopId,
                    category: dto.category,
                    purchasePrice: new client_1.Prisma.Decimal(dto.purchasePrice),
                    sellingPrice: new client_1.Prisma.Decimal(dto.sellingPrice),
                    minStockLevel: new client_1.Prisma.Decimal(dto.minStockLevel),
                    openingStock: new client_1.Prisma.Decimal(dto.openingStock),
                    reorderQty: dto.reorderQty !== undefined ? new client_1.Prisma.Decimal(dto.reorderQty) : null,
                    isActive: dto.isActive ?? true,
                    createdById: user.id,
                },
            });
            if (Number(dto.openingStock) > 0) {
                await this.stock.postMovement(tx, {
                    type: client_1.TransactionType.OPENING,
                    ref: `OPENING-${product.productCode}`,
                    date: new Date(),
                    shopId: product.shopId,
                    productId: product.id,
                    inQty: Number(dto.openingStock),
                    outQty: 0,
                    unitRate: undefined,
                    remarks: 'Opening stock',
                    userId: user.id,
                });
            }
            return product;
        });
    }
    async get(user, id) {
        const product = await this.prisma.product.findUnique({ where: { id }, include: { shop: true } });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        (0, shop_scope_1.assertShopScope)(user, product.shopId);
        return product;
    }
    async update(user, id, dto) {
        const existing = await this.get(user, id);
        if (dto.shopId)
            (0, shop_scope_1.assertShopScope)(user, dto.shopId);
        (0, shop_scope_1.assertShopScope)(user, existing.shopId);
        return this.prisma.product.update({
            where: { id },
            data: {
                productCode: dto.productCode,
                description: dto.description,
                uom: dto.uom,
                shopId: dto.shopId,
                category: dto.category,
                purchasePrice: dto.purchasePrice !== undefined ? new client_1.Prisma.Decimal(dto.purchasePrice) : undefined,
                sellingPrice: dto.sellingPrice !== undefined ? new client_1.Prisma.Decimal(dto.sellingPrice) : undefined,
                minStockLevel: dto.minStockLevel !== undefined ? new client_1.Prisma.Decimal(dto.minStockLevel) : undefined,
                openingStock: dto.openingStock !== undefined ? new client_1.Prisma.Decimal(dto.openingStock) : undefined,
                reorderQty: dto.reorderQty !== undefined ? new client_1.Prisma.Decimal(dto.reorderQty) : undefined,
                isActive: dto.isActive,
                updatedById: user.id,
            },
        });
    }
    async remove(user, id) {
        const existing = await this.get(user, id);
        const relatedUsage = await this.prisma.$transaction([
            this.prisma.goodsReceiptItem.count({ where: { productId: id } }),
            this.prisma.goodsIssueItem.count({ where: { productId: id } }),
            this.prisma.purchaseOrderItem.count({ where: { productId: id } }),
            this.prisma.damagedStock.count({ where: { productId: id } }),
            this.prisma.stockLedger.count({ where: { productId: id } }),
            this.prisma.stockSummary.count({ where: { productId: id } }),
        ]);
        const hasRelatedRecords = relatedUsage.some((count) => count > 0);
        if (hasRelatedRecords) {
            throw new common_1.BadRequestException('Cannot delete a product with existing stock or transaction history');
        }
        await this.prisma.$transaction([
            this.prisma.product.delete({ where: { id } }),
            this.prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: client_1.AuditAction.DELETE,
                    entityType: 'product',
                    entityId: existing.id,
                    oldValues: {
                        productCode: existing.productCode,
                        description: existing.description,
                    },
                },
            }),
        ]);
        return { ok: true };
    }
    async stockHistory(user, productId, query) {
        await this.get(user, productId);
        const take = (0, pagination_1.clampTake)(query.take);
        const rows = await this.prisma.stockLedger.findMany({
            where: { productId },
            take: take + 1,
            ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
            orderBy: { id: 'asc' },
        });
        const { items, meta } = (0, pagination_1.buildMeta)(rows, take);
        return { data: items, meta };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stock_service_1.StockService])
], ProductsService);
//# sourceMappingURL=products.service.js.map