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
exports.WarehouseService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
let WarehouseService = class WarehouseService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async inventory(user, query) {
        if (query.shop_id)
            (0, shop_scope_1.assertShopScope)(user, query.shop_id);
        const shopWhere = (0, shop_scope_1.shopListWhere)(user);
        const expiryByKey = new Map();
        const grItems = await this.prisma.goodsReceiptItem.findMany({
            where: {
                OR: [{ expiryDate: { not: null } }, { batchNumber: { not: null } }],
                header: {
                    status: client_1.DocumentStatus.POSTED,
                    shop: shopWhere,
                    ...(query.shop_id ? { shopId: query.shop_id } : {}),
                },
            },
            orderBy: { header: { postedAt: 'desc' } },
            select: {
                productId: true,
                expiryDate: true,
                batchNumber: true,
                storageLocationId: true,
                header: { select: { shopId: true, postedAt: true } },
            },
        });
        for (const line of grItems) {
            const shopId = line.header.shopId;
            const locationKey = line.storageLocationId ?? 'default';
            const key = `${line.productId}:${shopId}:${locationKey}`;
            if (!expiryByKey.has(key)) {
                expiryByKey.set(key, {
                    shopId,
                    expiryDate: line.expiryDate?.toISOString().slice(0, 10) ?? '',
                    batchNumber: line.batchNumber,
                    storageLocationId: line.storageLocationId,
                });
            }
        }
        const plantRows = await this.prisma.productPlant.findMany({
            where: {
                OR: [{ batchNumber: { not: null } }, { expiryDate: { not: null } }],
                shop: shopWhere,
                ...(query.shop_id ? { shopId: query.shop_id } : {}),
            },
            select: {
                productId: true,
                shopId: true,
                storageLocationId: true,
                batchNumber: true,
                expiryDate: true,
            },
        });
        for (const plant of plantRows) {
            const locationKey = plant.storageLocationId ?? 'default';
            const key = `${plant.productId}:${plant.shopId}:${locationKey}`;
            if (expiryByKey.has(key))
                continue;
            expiryByKey.set(key, {
                shopId: plant.shopId,
                expiryDate: plant.expiryDate?.toISOString().slice(0, 10) ?? '',
                batchNumber: plant.batchNumber,
                storageLocationId: plant.storageLocationId,
            });
        }
        return {
            data: Array.from(expiryByKey.entries()).map(([key, value]) => ({
                key,
                productId: key.split(':')[0],
                shopId: value.shopId,
                storageLocationId: value.storageLocationId,
                expiryDate: value.expiryDate,
                batchNumber: value.batchNumber,
            })),
        };
    }
};
exports.WarehouseService = WarehouseService;
exports.WarehouseService = WarehouseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WarehouseService);
//# sourceMappingURL=warehouse.service.js.map