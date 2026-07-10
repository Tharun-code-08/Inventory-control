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
exports.StorageLocationsService = void 0;
const common_1 = require("@nestjs/common");
const duplicate_conflict_1 = require("../../common/errors/duplicate-conflict");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
let StorageLocationsService = class StorageLocationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    normalizeCode(code) {
        return code.trim().toUpperCase();
    }
    async assertUniqueCode(shopId, code, excludeId, user) {
        const normalized = this.normalizeCode(code);
        const existing = await this.prisma.storageLocation.findUnique({
            where: { shopId_code: { shopId, code: normalized } },
            select: { id: true, code: true, name: true, isActive: true },
        });
        if (existing && existing.id !== excludeId) {
            (0, duplicate_conflict_1.throwDuplicateRecordConflict)(`Storage location code "${normalized}" already exists for this plant`, {
                recordId: existing.id,
                recordCode: existing.code,
                recordName: existing.name,
                entity: 'StorageLocation',
                listPath: '/storage-locations',
                isArchived: !existing.isActive,
            }, user
                ? {
                    userId: user.id,
                    userEmail: user.email,
                    shopId: user.shopId,
                    companyId: user.companyId,
                }
                : undefined);
        }
        return normalized;
    }
    async list(user, query) {
        return this.prisma.storageLocation.findMany({
            where: (0, shop_scope_1.storageLocationListWhere)(user, query.shop_id),
            orderBy: [{ shopId: 'asc' }, { code: 'asc' }],
            include: { shop: true },
        });
    }
    async create(user, dto) {
        (0, shop_scope_1.assertShopScope)(user, dto.shopId);
        const code = await this.assertUniqueCode(dto.shopId, dto.code, undefined, user);
        return this.prisma.storageLocation.create({
            data: {
                shopId: dto.shopId,
                code,
                name: dto.name.trim(),
                description: dto.description?.trim() ?? null,
                isActive: dto.isActive ?? true,
                createdById: user.id,
            },
            include: { shop: true },
        });
    }
    async get(user, id) {
        const row = await this.prisma.storageLocation.findUnique({ where: { id }, include: { shop: true } });
        if (!row)
            throw new common_1.NotFoundException('Storage location not found');
        (0, shop_scope_1.assertShopScope)(user, row.shopId);
        return row;
    }
    async update(user, id, dto) {
        const existing = await this.get(user, id);
        const shopId = dto.shopId ?? existing.shopId;
        if (dto.shopId)
            (0, shop_scope_1.assertShopScope)(user, dto.shopId);
        const code = dto.code !== undefined
            ? await this.assertUniqueCode(shopId, dto.code, id, user)
            : existing.code;
        return this.prisma.storageLocation.update({
            where: { id },
            data: {
                shopId,
                code,
                name: dto.name?.trim(),
                description: dto.description?.trim(),
                isActive: dto.isActive,
                updatedById: user.id,
            },
            include: { shop: true },
        });
    }
    async remove(user, id) {
        await this.get(user, id);
        return this.prisma.storageLocation.update({
            where: { id },
            data: { isActive: false, updatedById: user.id },
        });
    }
};
exports.StorageLocationsService = StorageLocationsService;
exports.StorageLocationsService = StorageLocationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StorageLocationsService);
//# sourceMappingURL=storage-locations.service.js.map