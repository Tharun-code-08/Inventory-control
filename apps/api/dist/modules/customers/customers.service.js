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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
let CustomersService = class CustomersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(user, search) {
        const scopedShop = (0, shop_scope_1.defaultShopFilter)(user);
        return this.prisma.customer.findMany({
            where: {
                ...(scopedShop ? { shopId: scopedShop } : {}),
                ...(search
                    ? {
                        OR: [
                            { customerName: { contains: search, mode: 'insensitive' } },
                            { customerCode: { contains: search, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            orderBy: { customerCode: 'asc' },
            include: { shop: true },
        });
    }
    async create(user, dto) {
        const shopId = dto.shopId ?? user.shopId;
        if (!shopId)
            throw new common_1.BadRequestException('shopId is required');
        (0, shop_scope_1.assertShopScope)(user, shopId);
        const count = await this.prisma.customer.count({ where: { shopId } });
        const customerCode = dto.customerCode?.trim() || `CUS-${String(count + 1).padStart(5, '0')}`;
        return this.prisma.customer.create({
            data: {
                customerCode,
                customerName: dto.customerName,
                email: dto.email?.toLowerCase?.() ?? null,
                phone: dto.phone ?? null,
                taxId: dto.taxId ?? null,
                street: dto.street ?? null,
                city: dto.city ?? null,
                state: dto.state ?? null,
                postalCode: dto.postalCode ?? null,
                country: dto.country ?? null,
                shopId,
                isActive: dto.isActive ?? true,
                createdById: user.id,
            },
            include: { shop: true },
        });
    }
    async get(user, id) {
        const item = await this.prisma.customer.findUnique({ where: { id }, include: { shop: true } });
        if (!item)
            throw new common_1.NotFoundException('Customer not found');
        (0, shop_scope_1.assertShopScope)(user, item.shopId);
        return item;
    }
    async update(user, id, dto) {
        const existing = await this.get(user, id);
        if (dto.shopId)
            (0, shop_scope_1.assertShopScope)(user, dto.shopId);
        return this.prisma.customer.update({
            where: { id },
            data: {
                customerName: dto.customerName,
                email: dto.email?.toLowerCase?.(),
                phone: dto.phone,
                taxId: dto.taxId,
                street: dto.street,
                city: dto.city,
                state: dto.state,
                postalCode: dto.postalCode,
                country: dto.country,
                shopId: dto.shopId ?? existing.shopId,
                isActive: dto.isActive,
                updatedById: user.id,
            },
            include: { shop: true },
        });
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map