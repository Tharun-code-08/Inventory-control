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
exports.ShopsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const pagination_1 = require("../../common/utils/pagination");
let ShopsService = class ShopsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(user, query) {
        const take = (0, pagination_1.clampTake)(query.take);
        const shopScope = (0, shop_scope_1.defaultShopFilter)(user);
        const where = {};
        if (shopScope)
            where.id = shopScope;
        if (query.is_active !== undefined)
            where.isActive = query.is_active;
        const rows = await this.prisma.shop.findMany({
            where,
            take: take + 1,
            ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
            orderBy: { id: 'asc' },
            include: { company: true },
        });
        const { items, meta } = (0, pagination_1.buildMeta)(rows, take);
        return { data: items, meta };
    }
    async create(user, dto) {
        return this.prisma.shop.create({
            data: {
                shopNumber: dto.shopNumber,
                shopName: dto.shopName,
                taxId: dto.taxId ?? null,
                address: dto.address,
                contactPerson: dto.contactPerson,
                mobile: dto.mobile,
                email: dto.email.toLowerCase().trim(),
                companyId: dto.companyId,
                isActive: dto.isActive ?? true,
                createdById: user.id,
            },
            include: { company: true },
        });
    }
    async get(user, id) {
        (0, shop_scope_1.assertShopScope)(user, id);
        const shop = await this.prisma.shop.findUnique({ where: { id }, include: { company: true } });
        if (!shop)
            throw new common_1.NotFoundException('Shop not found');
        return shop;
    }
    async update(user, id, dto) {
        (0, shop_scope_1.assertShopScope)(user, id);
        await this.get(user, id);
        return this.prisma.shop.update({
            where: { id },
            data: {
                shopNumber: dto.shopNumber,
                shopName: dto.shopName,
                taxId: dto.taxId,
                address: dto.address,
                contactPerson: dto.contactPerson,
                mobile: dto.mobile,
                email: dto.email?.toLowerCase().trim(),
                companyId: dto.companyId,
                isActive: dto.isActive,
                updatedById: user.id,
            },
            include: { company: true },
        });
    }
    async softDelete(user, id) {
        (0, shop_scope_1.assertShopScope)(user, id);
        const posted = await this.prisma.goodsReceiptHeader.count({
            where: { shopId: id, status: client_1.DocumentStatus.POSTED },
        });
        const postedGi = await this.prisma.goodsIssueHeader.count({
            where: { shopId: id, status: client_1.DocumentStatus.POSTED },
        });
        const postedDm = await this.prisma.damagedStock.count({
            where: { shopId: id, status: client_1.DocumentStatus.POSTED },
        });
        const postedPo = await this.prisma.purchaseOrderHeader.count({
            where: { shopId: id, status: client_1.PurchaseOrderStatus.CONFIRMED },
        });
        if (posted + postedGi + postedDm + postedPo > 0) {
            throw new common_1.BadRequestException('Cannot deactivate shop with posted transactions');
        }
        return this.prisma.shop.update({
            where: { id },
            data: { isActive: false, updatedById: user.id },
        });
    }
};
exports.ShopsService = ShopsService;
exports.ShopsService = ShopsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ShopsService);
//# sourceMappingURL=shops.service.js.map