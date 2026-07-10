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
const client_1 = require("@prisma/client");
const duplicate_conflict_1 = require("../../common/errors/duplicate-conflict");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const shop_access_1 = require("../../common/utils/shop-access");
const pagination_1 = require("../../common/utils/pagination");
const document_number_service_1 = require("../stock/document-number.service");
const serializable_tx_1 = require("../../common/utils/serializable-tx");
let CustomersService = class CustomersService {
    prisma;
    numbers;
    constructor(prisma, numbers) {
        this.prisma = prisma;
        this.numbers = numbers;
    }
    async list(user, query = {}) {
        const take = (0, pagination_1.clampTake)(query.take);
        const search = query.search?.trim();
        const where = {
            shop: (0, shop_scope_1.shopListWhere)(user),
            ...(search
                ? {
                    OR: [
                        { customerName: { contains: search, mode: 'insensitive' } },
                        { customerCode: { contains: search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const rows = await this.prisma.customer.findMany({
            where,
            take: take + 1,
            ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
            orderBy: { id: 'asc' },
            select: {
                id: true,
                customerCode: true,
                customerName: true,
                email: true,
                phone: true,
                taxId: true,
                pan: true,
                street: true,
                city: true,
                state: true,
                postalCode: true,
                country: true,
                isActive: true,
                shopId: true,
            },
        });
        const { items, meta } = (0, pagination_1.buildMeta)(rows, take);
        return { data: items, meta };
    }
    throwCustomerDuplicate(user, existing, context) {
        const label = `"${existing.customerName}" (${existing.customerCode})`;
        const message = context === 'name'
            ? `Customer ${label} already exists for this plant.`
            : `Customer ${label} already exists for this plant. It may have been created during an earlier attempt.`;
        (0, duplicate_conflict_1.throwDuplicateRecordConflict)(message, {
            recordId: existing.id,
            recordCode: existing.customerCode,
            recordName: existing.customerName,
            entity: 'Customer',
            listPath: '/customers',
            isArchived: !existing.isActive,
        }, {
            userId: user.id,
            userEmail: user.email,
            shopId: user.shopId,
            companyId: user.companyId,
        });
    }
    async create(user, dto) {
        await (0, shop_access_1.repairOrphanShopsForUser)(this.prisma, user);
        const shopId = dto.shopId ?? user.shopId;
        if (!shopId)
            throw new common_1.BadRequestException('shopId is required');
        await (0, shop_access_1.verifyShopInTenant)(this.prisma, user, shopId);
        const shop = await this.prisma.shop.findUnique({
            where: { id: shopId },
            select: { companyId: true },
        });
        if (!shop?.companyId) {
            throw new common_1.BadRequestException('This plant is not linked to your organisation yet. Refresh the Plants page and try again.');
        }
        const customerName = dto.customerName.trim();
        const manualCode = dto.customerCode?.trim();
        const existingByName = await this.prisma.customer.findFirst({
            where: {
                shopId,
                customerName: { equals: customerName, mode: 'insensitive' },
            },
            select: { id: true, customerName: true, customerCode: true, isActive: true },
        });
        if (existingByName) {
            this.throwCustomerDuplicate(user, existingByName, 'name');
        }
        if (manualCode) {
            const existingByCode = await this.prisma.customer.findFirst({
                where: { shopId, customerCode: manualCode },
                select: { id: true, customerName: true, customerCode: true, isActive: true },
            });
            if (existingByCode) {
                this.throwCustomerDuplicate(user, existingByCode, 'code');
            }
        }
        let attemptedCode = manualCode ?? '';
        try {
            return await (0, serializable_tx_1.runSerializableTxWithRetry)(this.prisma, async (tx) => {
                const customerCode = attemptedCode ||
                    (await this.numbers.nextConfiguredShopScopedNumber(tx, {
                        shopId,
                        docType: 'CUS',
                        date: new Date(),
                    }));
                attemptedCode = customerCode;
                return tx.customer.create({
                    data: {
                        customerCode,
                        customerName,
                        email: dto.email?.toLowerCase?.() ?? null,
                        phone: dto.phone ?? null,
                        taxId: dto.taxId ?? null,
                        pan: dto.pan?.toUpperCase?.() ?? null,
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
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002' &&
                attemptedCode) {
                const existingByCode = await this.prisma.customer.findFirst({
                    where: { shopId, customerCode: attemptedCode },
                    select: { id: true, customerName: true, customerCode: true, isActive: true },
                });
                if (existingByCode) {
                    this.throwCustomerDuplicate(user, existingByCode, 'code');
                }
            }
            throw error;
        }
    }
    async get(user, id) {
        const item = await this.prisma.customer.findUnique({ where: { id }, include: { shop: true } });
        if (!item)
            throw new common_1.NotFoundException('Customer not found');
        await (0, shop_access_1.verifyShopInTenant)(this.prisma, user, item.shopId);
        return item;
    }
    async update(user, id, dto) {
        const existing = await this.get(user, id);
        if (dto.shopId)
            await (0, shop_access_1.verifyShopInTenant)(this.prisma, user, dto.shopId);
        return this.prisma.customer.update({
            where: { id },
            data: {
                customerName: dto.customerName,
                email: dto.email?.toLowerCase?.(),
                phone: dto.phone,
                taxId: dto.taxId,
                pan: dto.pan?.toUpperCase?.(),
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        document_number_service_1.DocumentNumberService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map