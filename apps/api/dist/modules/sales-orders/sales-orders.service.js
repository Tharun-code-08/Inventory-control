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
const stock_service_1 = require("../stock/stock.service");
let SalesOrdersService = class SalesOrdersService {
    prisma;
    stock;
    constructor(prisma, stock) {
        this.prisma = prisma;
        this.stock = stock;
    }
    async list(user) {
        const scopedShop = (0, shop_scope_1.defaultShopFilter)(user);
        return this.prisma.salesOrderHeader.findMany({
            where: scopedShop ? { shopId: scopedShop } : undefined,
            orderBy: { orderDate: 'desc' },
            include: { customer: true, items: { include: { product: true } } },
        });
    }
    async create(user, dto) {
        const shopId = dto.shopId ?? user.shopId;
        if (!shopId)
            throw new common_1.BadRequestException('shopId is required');
        (0, shop_scope_1.assertShopScope)(user, shopId);
        const count = await this.prisma.salesOrderHeader.count({ where: { shopId } });
        const soNumber = `SO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
        return this.prisma.salesOrderHeader.create({
            data: {
                soNumber,
                orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
                expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
                customerId: dto.customerId,
                shopId,
                status: client_1.SalesOrderStatus.DRAFT,
                remarks: dto.remarks ?? null,
                totalValue: new client_1.Prisma.Decimal((dto.items ?? []).reduce((sum, it) => sum + Number(it.quantity ?? 0) * Number(it.unitPrice ?? 0), 0)),
                createdById: user.id,
                items: {
                    create: (dto.items ?? []).map((item) => ({
                        productId: item.productId,
                        quantity: new client_1.Prisma.Decimal(item.quantity ?? 0),
                        uom: item.uom ?? 'UNIT',
                        unitPrice: new client_1.Prisma.Decimal(item.unitPrice ?? 0),
                        lineValue: new client_1.Prisma.Decimal(Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)),
                        createdById: user.id,
                    })),
                },
            },
            include: { customer: true, items: { include: { product: true } } },
        });
    }
    async get(user, id) {
        const so = await this.prisma.salesOrderHeader.findUnique({
            where: { id },
            include: { customer: true, items: { include: { product: true } } },
        });
        if (!so)
            throw new common_1.NotFoundException('Sales order not found');
        (0, shop_scope_1.assertShopScope)(user, so.shopId);
        return so;
    }
    async confirm(user, id) {
        const so = await this.get(user, id);
        if (so.status !== client_1.SalesOrderStatus.DRAFT)
            return so;
        return this.prisma.salesOrderHeader.update({
            where: { id },
            data: { status: client_1.SalesOrderStatus.CONFIRMED, updatedById: user.id },
            include: { customer: true, items: { include: { product: true } } },
        });
    }
    async fulfill(user, id) {
        const so = await this.get(user, id);
        return this.prisma.$transaction(async (tx) => {
            for (const item of so.items) {
                await this.stock.postMovement(tx, {
                    type: client_1.TransactionType.GOODS_ISSUE,
                    ref: so.soNumber,
                    date: new Date(),
                    shopId: so.shopId,
                    productId: item.productId,
                    inQty: 0,
                    outQty: Number(item.quantity),
                    unitRate: Number(item.unitPrice),
                    remarks: 'Sales order fulfillment',
                    userId: user.id,
                });
            }
            return tx.salesOrderHeader.update({
                where: { id },
                data: { status: client_1.SalesOrderStatus.FULFILLED, updatedById: user.id },
                include: { customer: true, items: { include: { product: true } } },
            });
        });
    }
};
exports.SalesOrdersService = SalesOrdersService;
exports.SalesOrdersService = SalesOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stock_service_1.StockService])
], SalesOrdersService);
//# sourceMappingURL=sales-orders.service.js.map