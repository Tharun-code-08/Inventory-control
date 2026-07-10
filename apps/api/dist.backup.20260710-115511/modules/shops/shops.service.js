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
const shop_access_1 = require("../../common/utils/shop-access");
const pagination_1 = require("../../common/utils/pagination");
const subscription_service_1 = require("../billing/subscription.service");
const branding_profile_service_1 = require("../../common/branding/branding-profile.service");
const branding_resolver_service_1 = require("../../common/branding/branding-resolver.service");
let ShopsService = class ShopsService {
    prisma;
    subscriptions;
    branding;
    brandingResolver;
    constructor(prisma, subscriptions, branding, brandingResolver) {
        this.prisma = prisma;
        this.subscriptions = subscriptions;
        this.branding = branding;
        this.brandingResolver = brandingResolver;
    }
    async repairOrphanShops(user) {
        await (0, shop_access_1.repairOrphanShopsForUser)(this.prisma, user);
    }
    async assertPlantAccess(user, shopId) {
        const shop = await this.prisma.shop.findUnique({
            where: { id: shopId },
            select: { id: true, companyId: true, createdById: true },
        });
        if (!shop)
            throw new common_1.NotFoundException('Shop not found');
        if (user.companyId && shop.companyId === user.companyId)
            return;
        if (!shop.companyId && shop.createdById === user.id)
            return;
        if (!shop.companyId && shop.createdById && user.companyId) {
            const creator = await this.prisma.user.findUnique({
                where: { id: shop.createdById },
                select: { shop: { select: { companyId: true } } },
            });
            if (creator?.shop?.companyId === user.companyId)
                return;
        }
        const allowed = (0, shop_scope_1.shopListWhere)(user);
        const visible = await this.prisma.shop.findFirst({
            where: { id: shopId, ...allowed },
            select: { id: true },
        });
        if (!visible) {
            throw new common_1.NotFoundException('Shop not found');
        }
    }
    async purgeUnusedStorageLocations(shopId) {
        const locations = await this.prisma.storageLocation.findMany({
            where: { shopId },
            select: { id: true },
        });
        for (const location of locations) {
            const [productPlants, receiptItems, transfersFrom, transfersTo] = await Promise.all([
                this.prisma.productPlant.count({ where: { storageLocationId: location.id } }),
                this.prisma.goodsReceiptItem.count({ where: { storageLocationId: location.id } }),
                this.prisma.stockTransferHeader.count({ where: { fromStorageLocationId: location.id } }),
                this.prisma.stockTransferHeader.count({ where: { toStorageLocationId: location.id } }),
            ]);
            if (productPlants + receiptItems + transfersFrom + transfersTo === 0) {
                await this.prisma.storageLocation.delete({ where: { id: location.id } });
            }
        }
    }
    async list(user, query) {
        await this.repairOrphanShops(user);
        const take = (0, pagination_1.clampTake)(query.take);
        const where = {
            ...(0, shop_scope_1.shopListWhere)(user),
        };
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
        await this.repairOrphanShops(user);
        const companyId = dto.companyId ?? user.companyId ?? undefined;
        if (companyId) {
            await this.subscriptions.assertWarehouseLimit(companyId);
        }
        return this.prisma.shop.create({
            data: {
                shopNumber: dto.shopNumber,
                shopName: dto.shopName,
                taxId: dto.taxId ?? null,
                address: dto.address,
                contactPerson: dto.contactPerson,
                mobile: dto.mobile,
                email: dto.email.toLowerCase().trim(),
                companyId,
                isActive: dto.isActive ?? true,
                createdById: user.id,
            },
            include: { company: true },
        });
    }
    async get(user, id) {
        await this.assertPlantAccess(user, id);
        const shop = await this.prisma.shop.findUnique({ where: { id }, include: { company: true } });
        if (!shop)
            throw new common_1.NotFoundException('Shop not found');
        return shop;
    }
    async update(user, id, dto) {
        await this.assertPlantAccess(user, id);
        const current = await this.get(user, id);
        const updated = await this.prisma.shop.update({
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
        const hasBrandingChange = (dto.shopName !== undefined && dto.shopName !== current.shopName) ||
            (dto.address !== undefined && dto.address !== current.address) ||
            (dto.taxId !== undefined && dto.taxId !== current.taxId) ||
            (dto.email !== undefined && dto.email?.toLowerCase().trim() !== current.email) ||
            (dto.mobile !== undefined && dto.mobile !== current.mobile);
        if (hasBrandingChange) {
            await this.branding.bumpBrandingVersionForShop(id, user);
        }
        return updated;
    }
    async updateBranding(user, id, dto, logo) {
        await this.assertPlantAccess(user, id);
        await this.get(user, id);
        return this.branding.updateShopBranding(user, id, dto, logo);
    }
    async getBranding(user, id) {
        await this.assertPlantAccess(user, id);
        await this.get(user, id);
        const profile = await this.brandingResolver.resolveForShop(id);
        return {
            profile,
            health: this.brandingResolver.buildHealth(profile),
        };
    }
    async remove(user, id) {
        await this.assertPlantAccess(user, id);
        await this.get(user, id);
        const countBlockers = async () => {
            const [productPlantCount, storageLocCount, userCount, grCount, giCount, dmgCount, poCount, ledgerCount, summaryCount, costLayerCount,] = await Promise.all([
                this.prisma.productPlant.count({ where: { shopId: id } }),
                this.prisma.storageLocation.count({ where: { shopId: id } }),
                this.prisma.user.count({ where: { shopId: id } }),
                this.prisma.goodsReceiptHeader.count({ where: { shopId: id } }),
                this.prisma.goodsIssueHeader.count({ where: { shopId: id } }),
                this.prisma.damagedStock.count({ where: { shopId: id } }),
                this.prisma.purchaseOrderHeader.count({ where: { shopId: id } }),
                this.prisma.stockLedger.count({ where: { shopId: id } }),
                this.prisma.stockSummary.count({ where: { shopId: id } }),
                this.prisma.costLayer.count({ where: { shopId: id } }),
            ]);
            const blockers = [];
            if (productPlantCount > 0)
                blockers.push('product assignments');
            if (storageLocCount > 0)
                blockers.push('storage locations');
            if (userCount > 0)
                blockers.push('users');
            if (grCount + giCount + dmgCount + poCount > 0)
                blockers.push('transactions');
            if (ledgerCount + summaryCount + costLayerCount > 0)
                blockers.push('stock history');
            return blockers;
        };
        let blockers = await countBlockers();
        if (blockers.length === 1 && blockers[0] === 'storage locations') {
            await this.purgeUnusedStorageLocations(id);
            blockers = await countBlockers();
        }
        if (blockers.length > 0) {
            throw new common_1.BadRequestException(`Cannot delete this plant — it still has ${blockers.join(', ')}. ` +
                'Deactivate the plant instead to keep its history intact.');
        }
        try {
            await this.prisma.shop.delete({ where: { id } });
            return { ok: true };
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
                throw new common_1.BadRequestException('Cannot delete this plant — it is still referenced by other records. ' +
                    'Deactivate the plant instead.');
            }
            throw err;
        }
    }
};
exports.ShopsService = ShopsService;
exports.ShopsService = ShopsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        subscription_service_1.SubscriptionService,
        branding_profile_service_1.BrandingProfileService,
        branding_resolver_service_1.BrandingResolverService])
], ShopsService);
//# sourceMappingURL=shops.service.js.map