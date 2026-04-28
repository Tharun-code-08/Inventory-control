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
exports.RfqsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
let RfqsService = class RfqsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(user) {
        const scopedShop = (0, shop_scope_1.defaultShopFilter)(user);
        return this.prisma.rfqHeader.findMany({
            where: scopedShop ? { shopId: scopedShop } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                shop: true,
                suppliers: { include: { supplier: true } },
                items: { include: { product: true } },
            },
        });
    }
    async create(user, dto) {
        const shopId = dto.shopId ?? user.shopId;
        if (!shopId)
            throw new common_1.BadRequestException('shopId is required');
        (0, shop_scope_1.assertShopScope)(user, shopId);
        const count = await this.prisma.rfqHeader.count({ where: { shopId } });
        const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
        return this.prisma.rfqHeader.create({
            data: {
                rfqNumber,
                rfqDate: dto.rfqDate ? new Date(dto.rfqDate) : new Date(),
                deadline: dto.deadline ? new Date(dto.deadline) : null,
                title: dto.title,
                notes: dto.notes ?? null,
                shopId,
                status: client_1.DocumentStatus.DRAFT,
                createdById: user.id,
                suppliers: {
                    create: (dto.suppliers ?? []).map((supplierId) => ({ supplierId })),
                },
                items: {
                    create: (dto.items ?? []).map((item) => ({
                        productId: item.productId ?? null,
                        description: item.description ?? null,
                        quantity: new client_1.Prisma.Decimal(item.quantity ?? 0),
                        uom: item.uom ?? 'UNIT',
                        specifications: item.specifications ?? null,
                        createdById: user.id,
                    })),
                },
            },
            include: {
                shop: true,
                suppliers: { include: { supplier: true } },
                items: { include: { product: true } },
            },
        });
    }
    async get(user, id) {
        const rfq = await this.prisma.rfqHeader.findUnique({
            where: { id },
            include: {
                shop: true,
                suppliers: { include: { supplier: true } },
                items: { include: { product: true } },
            },
        });
        if (!rfq)
            throw new common_1.NotFoundException('RFQ not found');
        (0, shop_scope_1.assertShopScope)(user, rfq.shopId);
        return rfq;
    }
    async update(user, id, dto) {
        const existing = await this.get(user, id);
        return this.prisma.$transaction(async (tx) => {
            await tx.rfqSupplier.deleteMany({ where: { rfqId: id } });
            await tx.rfqItem.deleteMany({ where: { rfqHeaderId: id } });
            const updated = await tx.rfqHeader.update({
                where: { id },
                data: {
                    rfqDate: dto.rfqDate ? new Date(dto.rfqDate) : existing.rfqDate,
                    deadline: dto.deadline ? new Date(dto.deadline) : null,
                    title: dto.title ?? existing.title,
                    notes: dto.notes ?? null,
                    updatedById: user.id,
                    suppliers: {
                        create: (dto.suppliers ?? []).map((supplierId) => ({ supplierId })),
                    },
                    items: {
                        create: (dto.items ?? []).map((item) => ({
                            productId: item.productId ?? null,
                            description: item.description ?? null,
                            quantity: new client_1.Prisma.Decimal(item.quantity ?? 0),
                            uom: item.uom ?? 'UNIT',
                            specifications: item.specifications ?? null,
                            createdById: user.id,
                        })),
                    },
                },
                include: {
                    shop: true,
                    suppliers: { include: { supplier: true } },
                    items: { include: { product: true } },
                },
            });
            return updated;
        });
    }
    async send(user, id) {
        const existing = await this.get(user, id);
        return this.prisma.rfqHeader.update({
            where: { id },
            data: {
                status: client_1.DocumentStatus.POSTED,
                postedAt: new Date(),
                updatedById: user.id,
                notes: `${existing.notes ?? ''}\n[Sent ${new Date().toISOString()}]`.trim(),
            },
        });
    }
    async close(user, id) {
        await this.get(user, id);
        return this.prisma.rfqHeader.update({
            where: { id },
            data: {
                notes: `[Closed ${new Date().toISOString()}]`,
                updatedById: user.id,
            },
        });
    }
};
exports.RfqsService = RfqsService;
exports.RfqsService = RfqsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RfqsService);
//# sourceMappingURL=rfqs.service.js.map