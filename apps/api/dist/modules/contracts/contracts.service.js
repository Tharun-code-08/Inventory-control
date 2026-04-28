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
exports.ContractsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
let ContractsService = class ContractsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(user) {
        return this.prisma.contractHeader.findMany({
            where: user.shopId ? { shopId: user.shopId } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                supplier: true,
                rfq: true,
                items: { include: { product: true } },
            },
        });
    }
    async create(user, dto) {
        const shopId = dto.shopId ?? user.shopId;
        if (!shopId)
            throw new common_1.BadRequestException('shopId is required');
        (0, shop_scope_1.assertShopScope)(user, shopId);
        const count = await this.prisma.contractHeader.count({ where: { shopId } });
        const contractNumber = `CT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
        return this.prisma.contractHeader.create({
            data: {
                contractNumber,
                shopId,
                supplierId: dto.supplierId,
                rfqId: dto.rfqId ?? null,
                title: dto.title,
                paymentTerms: dto.paymentTerms ?? null,
                startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                notes: dto.notes ?? null,
                status: client_1.DocumentStatus.DRAFT,
                createdById: user.id,
                items: {
                    create: (dto.items ?? []).map((item) => ({
                        productId: item.productId ?? null,
                        description: item.description ?? null,
                        quantity: new client_1.Prisma.Decimal(item.quantity ?? 0),
                        uom: item.uom ?? 'UNIT',
                        unitPrice: new client_1.Prisma.Decimal(item.unitPrice ?? 0),
                        lineValue: new client_1.Prisma.Decimal((item.quantity ?? 0) * (item.unitPrice ?? 0)),
                        createdById: user.id,
                    })),
                },
            },
            include: {
                supplier: true,
                rfq: true,
                items: { include: { product: true } },
            },
        });
    }
    async get(user, id) {
        const contract = await this.prisma.contractHeader.findUnique({
            where: { id },
            include: {
                supplier: true,
                rfq: true,
                items: { include: { product: true } },
            },
        });
        if (!contract)
            throw new common_1.NotFoundException('Contract not found');
        (0, shop_scope_1.assertShopScope)(user, contract.shopId);
        return contract;
    }
    async update(user, id, dto) {
        const existing = await this.get(user, id);
        return this.prisma.$transaction(async (tx) => {
            await tx.contractItem.deleteMany({ where: { contractId: id } });
            return tx.contractHeader.update({
                where: { id },
                data: {
                    supplierId: dto.supplierId ?? existing.supplierId,
                    rfqId: dto.rfqId ?? existing.rfqId,
                    title: dto.title ?? existing.title,
                    paymentTerms: dto.paymentTerms ?? null,
                    startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
                    endDate: dto.endDate ? new Date(dto.endDate) : null,
                    notes: dto.notes ?? null,
                    updatedById: user.id,
                    items: {
                        create: (dto.items ?? []).map((item) => ({
                            productId: item.productId ?? null,
                            description: item.description ?? null,
                            quantity: new client_1.Prisma.Decimal(item.quantity ?? 0),
                            uom: item.uom ?? 'UNIT',
                            unitPrice: new client_1.Prisma.Decimal(item.unitPrice ?? 0),
                            lineValue: new client_1.Prisma.Decimal((item.quantity ?? 0) * (item.unitPrice ?? 0)),
                            createdById: user.id,
                        })),
                    },
                },
                include: {
                    supplier: true,
                    rfq: true,
                    items: { include: { product: true } },
                },
            });
        });
    }
    async activate(user, id) {
        await this.get(user, id);
        return this.prisma.contractHeader.update({
            where: { id },
            data: { status: client_1.DocumentStatus.POSTED, postedAt: new Date(), updatedById: user.id },
        });
    }
    async terminate(user, id) {
        await this.get(user, id);
        return this.prisma.contractHeader.update({
            where: { id },
            data: { notes: `[Terminated ${new Date().toISOString()}]`, updatedById: user.id },
        });
    }
};
exports.ContractsService = ContractsService;
exports.ContractsService = ContractsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContractsService);
//# sourceMappingURL=contracts.service.js.map