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
exports.StockTransfersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const pagination_1 = require("../../common/utils/pagination");
const idempotency_1 = require("../../common/utils/idempotency");
const date_guards_1 = require("../../common/utils/date-guards");
const serializable_tx_1 = require("../../common/utils/serializable-tx");
const document_number_service_1 = require("../stock/document-number.service");
const stock_service_1 = require("../stock/stock.service");
const domain_exceptions_1 = require("../../common/exceptions/domain.exceptions");
const audit_service_1 = require("../audit/audit.service");
const inventory_audit_1 = require("../../common/state-machines/inventory-audit");
let StockTransfersService = class StockTransfersService {
    prisma;
    stock;
    numbers;
    audit;
    constructor(prisma, stock, numbers, audit) {
        this.prisma = prisma;
        this.stock = stock;
        this.numbers = numbers;
        this.audit = audit;
    }
    serializeListRow(row) {
        return {
            id: row.id,
            transferNumber: row.transferNumber,
            transferDate: row.transferDate.toISOString().slice(0, 10),
            fromShopId: row.fromShopId,
            toShopId: row.toShopId,
            fromStorageLocationId: row.fromStorageLocationId,
            toStorageLocationId: row.toStorageLocationId,
            status: row.status,
            notes: row.notes,
            postedAt: row.postedAt?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
            itemCount: row._count.items,
            fromShop: row.fromShop
                ? {
                    id: row.fromShop.id,
                    shopName: row.fromShop.shopName,
                    shopNumber: row.fromShop.shopNumber,
                }
                : undefined,
            toShop: row.toShop
                ? {
                    id: row.toShop.id,
                    shopName: row.toShop.shopName,
                    shopNumber: row.toShop.shopNumber,
                }
                : undefined,
        };
    }
    async available(tx, shopId, productId) {
        return this.stock.resolveBalance(tx, shopId, productId);
    }
    userCanAccessShop(user, shopId) {
        try {
            (0, shop_scope_1.assertShopScope)(user, shopId);
            return true;
        }
        catch {
            return false;
        }
    }
    assertTransferReadable(user, fromShopId, toShopId) {
        if (!this.userCanAccessShop(user, fromShopId) && !this.userCanAccessShop(user, toShopId)) {
            throw new common_1.ForbiddenException('Shop scope mismatch');
        }
    }
    async assertSameCompanyShops(tx, fromShopId, toShopId) {
        const shops = await tx.shop.findMany({
            where: { id: { in: [fromShopId, toShopId] } },
            select: { id: true, companyId: true },
        });
        if (shops.length !== 2) {
            throw new common_1.BadRequestException('Invalid shop selection');
        }
        const [fromShop, toShop] = shops.sort((a, b) => a.id.localeCompare(b.id));
        if (fromShop.companyId !== toShop.companyId) {
            throw new common_1.BadRequestException('Transfers are only allowed between shops in the same company');
        }
    }
    async assertStorageLocation(tx, storageLocationId, shopId, label) {
        if (!storageLocationId)
            return;
        const location = await tx.storageLocation.findUnique({ where: { id: storageLocationId } });
        if (!location || location.shopId !== shopId) {
            throw new common_1.BadRequestException(`Invalid ${label} storage location`);
        }
    }
    async list(user, query) {
        const take = (0, pagination_1.clampTake)(query.take);
        if (query.from_shop_id)
            (0, shop_scope_1.assertShopScope)(user, query.from_shop_id);
        if (query.to_shop_id)
            (0, shop_scope_1.assertShopScope)(user, query.to_shop_id);
        const shopScope = (0, shop_scope_1.shopListWhere)(user);
        const where = {
            OR: [{ fromShop: shopScope }, { toShop: shopScope }],
            ...(query.from_shop_id ? { fromShopId: query.from_shop_id } : {}),
            ...(query.to_shop_id ? { toShopId: query.to_shop_id } : {}),
        };
        if (query.status)
            where.status = query.status;
        if (query.date_from || query.date_to) {
            where.transferDate = {};
            if (query.date_from)
                where.transferDate.gte = new Date(query.date_from);
            if (query.date_to)
                where.transferDate.lte = new Date(query.date_to);
        }
        const rows = await this.prisma.stockTransferHeader.findMany({
            where,
            take: take + 1,
            ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            include: {
                fromShop: true,
                toShop: true,
                _count: { select: { items: true } },
            },
        });
        const { items, meta } = (0, pagination_1.buildMeta)(rows, take);
        return { data: items.map((row) => this.serializeListRow(row)), meta };
    }
    async create(user, dto) {
        (0, shop_scope_1.assertShopScope)(user, dto.fromShopId);
        (0, shop_scope_1.assertShopScope)(user, dto.toShopId);
        if (dto.fromShopId === dto.toShopId) {
            throw new common_1.BadRequestException('Source and destination shops must differ');
        }
        const transferDate = new Date(dto.transferDate);
        (0, date_guards_1.assertNotFuture)(transferDate);
        for (const line of dto.items) {
            if (line.quantity <= 0)
                throw new common_1.BadRequestException('Line quantities must be > 0');
        }
        const idempotencyScope = user.companyId
            ? `company:${user.companyId}`
            : user.shopId
                ? `shop:${user.shopId}`
                : 'global';
        const idempotencyCacheKey = dto.idempotencyKey?.trim()
            ? `st:create:${dto.idempotencyKey.trim()}`
            : undefined;
        return this.prisma.$transaction(async (tx) => {
            const existing = await (0, idempotency_1.tryGetIdempotentResult)(tx, idempotencyCacheKey, idempotencyScope);
            if (existing?.stId) {
                const prior = await tx.stockTransferHeader.findUnique({
                    where: { id: existing.stId },
                    include: {
                        items: { include: { product: true } },
                        fromShop: true,
                        toShop: true,
                        fromStorageLocation: true,
                        toStorageLocation: true,
                    },
                });
                if (prior)
                    return prior;
            }
            await this.assertSameCompanyShops(tx, dto.fromShopId, dto.toShopId);
            await this.assertStorageLocation(tx, dto.fromStorageLocationId, dto.fromShopId, 'from');
            await this.assertStorageLocation(tx, dto.toStorageLocationId, dto.toShopId, 'to');
            const transferNumber = await this.numbers.nextShopScopedNumber(tx, {
                shopId: dto.fromShopId,
                docType: 'ST',
                basePrefix: 'ST',
                date: transferDate,
            });
            const lines = dto.items.map((line) => ({
                productId: line.productId,
                quantity: new client_1.Prisma.Decimal(line.quantity),
                uom: line.uom,
            }));
            const header = await tx.stockTransferHeader.create({
                data: {
                    transferNumber,
                    transferDate,
                    fromShopId: dto.fromShopId,
                    toShopId: dto.toShopId,
                    fromStorageLocationId: dto.fromStorageLocationId ?? null,
                    toStorageLocationId: dto.toStorageLocationId ?? null,
                    notes: dto.notes?.trim(),
                    status: client_1.DocumentStatus.DRAFT,
                    createdById: user.id,
                    items: { create: lines },
                },
                include: {
                    items: { include: { product: true } },
                    fromShop: true,
                    toShop: true,
                    fromStorageLocation: true,
                    toStorageLocation: true,
                },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.CREATE,
                entityType: 'STOCK_TRANSFER',
                entityId: header.id,
                newValues: {
                    transferNumber: header.transferNumber,
                    fromShopId: header.fromShopId,
                    toShopId: header.toShopId,
                    itemCount: dto.items.length,
                },
            }, tx);
            await (0, idempotency_1.trySetIdempotentResult)(tx, idempotencyCacheKey, { stId: header.id }, user.id, idempotencyScope);
            return header;
        });
    }
    async get(user, id) {
        const transfer = await this.prisma.stockTransferHeader.findUnique({
            where: { id },
            include: {
                items: { include: { product: true } },
                fromShop: true,
                toShop: true,
                fromStorageLocation: true,
                toStorageLocation: true,
            },
        });
        if (!transfer)
            throw new common_1.NotFoundException('Stock transfer not found');
        this.assertTransferReadable(user, transfer.fromShopId, transfer.toShopId);
        return transfer;
    }
    async post(user, id) {
        const header = await this.get(user, id);
        if (header.status === client_1.DocumentStatus.POSTED)
            throw new domain_exceptions_1.DocumentAlreadyPostedException();
        (0, shop_scope_1.assertShopScope)(user, header.fromShopId);
        (0, shop_scope_1.assertShopScope)(user, header.toShopId);
        (0, date_guards_1.assertNotFuture)(header.transferDate);
        return (0, serializable_tx_1.runSerializableTxWithRetry)(this.prisma, async (tx) => {
            const fresh = await tx.stockTransferHeader.findUnique({
                where: { id },
                include: { items: true },
            });
            if (!fresh || fresh.status !== client_1.DocumentStatus.DRAFT) {
                throw new domain_exceptions_1.DocumentAlreadyPostedException();
            }
            await this.assertSameCompanyShops(tx, fresh.fromShopId, fresh.toShopId);
            const failures = [];
            for (const line of fresh.items) {
                const avail = await this.available(tx, fresh.fromShopId, line.productId);
                if (avail.lt(line.quantity)) {
                    const product = await tx.product.findUnique({ where: { id: line.productId } });
                    failures.push({
                        productId: line.productId,
                        productCode: product?.productCode ?? line.productId,
                        available: avail.toString(),
                        requested: line.quantity.toString(),
                    });
                }
            }
            if (failures.length) {
                throw new domain_exceptions_1.InsufficientStockException('Insufficient stock for posting', failures);
            }
            const beforeQtyMapFrom = new Map();
            const beforeQtyMapTo = new Map();
            for (const line of fresh.items) {
                const fromSummary = await tx.stockSummary.findUnique({
                    where: { shopId_productId: { shopId: fresh.fromShopId, productId: line.productId } },
                });
                const toSummary = await tx.stockSummary.findUnique({
                    where: { shopId_productId: { shopId: fresh.toShopId, productId: line.productId } },
                });
                beforeQtyMapFrom.set(line.productId, Number(fromSummary?.currentStock ?? 0));
                beforeQtyMapTo.set(line.productId, Number(toSummary?.currentStock ?? 0));
            }
            const transitioned = await tx.stockTransferHeader.updateMany({
                where: { id, status: client_1.DocumentStatus.DRAFT },
                data: { status: client_1.DocumentStatus.POSTED, postedAt: new Date(), updatedById: user.id },
            });
            if (transitioned.count === 0) {
                throw new domain_exceptions_1.DocumentAlreadyPostedException();
            }
            const shops = await tx.shop.findMany({
                where: { id: { in: [fresh.fromShopId, fresh.toShopId] } },
                select: { id: true, companyId: true },
            });
            const companyId = shops[0]?.companyId;
            for (const line of fresh.items) {
                await this.stock.postMovementOnce(tx, {
                    type: client_1.TransactionType.STOCK_TRANSFER_OUT,
                    ref: fresh.transferNumber,
                    date: fresh.transferDate,
                    shopId: fresh.fromShopId,
                    productId: line.productId,
                    inQty: 0,
                    outQty: line.quantity,
                    sourceType: 'STOCK_TRANSFER',
                    sourceId: fresh.id,
                    sourceLineId: line.id,
                    idempotencyKey: `st:out:${fresh.id}:${line.id}`,
                    userId: user.id,
                });
                await this.stock.postMovementOnce(tx, {
                    type: client_1.TransactionType.STOCK_TRANSFER_IN,
                    ref: fresh.transferNumber,
                    date: fresh.transferDate,
                    shopId: fresh.toShopId,
                    productId: line.productId,
                    inQty: line.quantity,
                    outQty: 0,
                    sourceType: 'STOCK_TRANSFER',
                    sourceId: fresh.id,
                    sourceLineId: line.id,
                    idempotencyKey: `st:in:${fresh.id}:${line.id}`,
                    userId: user.id,
                });
                const afterFromSummary = await tx.stockSummary.findUnique({
                    where: { shopId_productId: { shopId: fresh.fromShopId, productId: line.productId } },
                });
                const afterToSummary = await tx.stockSummary.findUnique({
                    where: { shopId_productId: { shopId: fresh.toShopId, productId: line.productId } },
                });
                const beforeFromQty = beforeQtyMapFrom.get(line.productId) ?? 0;
                const afterFromQty = Number(afterFromSummary?.currentStock ?? 0);
                const beforeToQty = beforeQtyMapTo.get(line.productId) ?? 0;
                const afterToQty = Number(afterToSummary?.currentStock ?? 0);
                if (companyId) {
                    await this.audit.log((0, inventory_audit_1.buildTransferStockAudit)({
                        companyId,
                        userId: user.id,
                        productId: line.productId,
                        fromWarehouse: fresh.fromShopId,
                        toWarehouse: fresh.toShopId,
                        qty: Number(line.quantity),
                        beforeFromQty,
                        afterFromQty,
                        beforeToQty,
                        afterToQty,
                        referenceNo: fresh.transferNumber,
                    }), tx);
                }
            }
            const posted = await tx.stockTransferHeader.findUniqueOrThrow({
                where: { id },
                include: {
                    items: { include: { product: true } },
                    fromShop: true,
                    toShop: true,
                    fromStorageLocation: true,
                    toStorageLocation: true,
                },
            });
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.POST,
                entityType: 'STOCK_TRANSFER',
                entityId: posted.id,
                newValues: {
                    transferNumber: posted.transferNumber,
                    status: posted.status,
                    itemCount: posted.items.length,
                    fromShopId: posted.fromShopId,
                    toShopId: posted.toShopId,
                },
            }, tx);
            return posted;
        });
    }
};
exports.StockTransfersService = StockTransfersService;
exports.StockTransfersService = StockTransfersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stock_service_1.StockService,
        document_number_service_1.DocumentNumberService,
        audit_service_1.AuditService])
], StockTransfersService);
//# sourceMappingURL=stock-transfers.service.js.map