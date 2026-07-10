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
exports.DamagedStockService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const Handlebars = require("handlebars");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
const pagination_1 = require("../../common/utils/pagination");
const date_guards_1 = require("../../common/utils/date-guards");
const document_number_service_1 = require("../stock/document-number.service");
const stock_service_1 = require("../stock/stock.service");
const domain_exceptions_1 = require("../../common/exceptions/domain.exceptions");
const audit_service_1 = require("../audit/audit.service");
const inventory_audit_1 = require("../../common/state-machines/inventory-audit");
let DamagedStockService = class DamagedStockService {
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
    async available(tx, shopId, productId) {
        const s = await tx.stockSummary.findUnique({ where: { shopId_productId: { shopId, productId } } });
        return s?.currentStock ?? new client_1.Prisma.Decimal(0);
    }
    async list(user, query) {
        const take = (0, pagination_1.clampTake)(query.take);
        if (query.shop_id)
            (0, shop_scope_1.assertShopScope)(user, query.shop_id);
        const where = {
            shop: (0, shop_scope_1.shopListWhere)(user),
            ...(query.shop_id ? { shopId: query.shop_id } : {}),
        };
        const rows = await this.prisma.damagedStock.findMany({
            where,
            take: take + 1,
            ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
            orderBy: { id: 'asc' },
            include: { shop: true, product: true },
        });
        const { items, meta } = (0, pagination_1.buildMeta)(rows, take);
        return { data: items, meta };
    }
    async create(user, dto) {
        (0, shop_scope_1.assertShopScope)(user, dto.shopId);
        const damageDate = new Date(dto.damageDate);
        (0, date_guards_1.assertNotFuture)(damageDate);
        if (dto.damagedQuantity <= 0)
            throw new common_1.BadRequestException('Quantity must be > 0');
        return this.prisma.$transaction(async (tx) => {
            const avail = await this.available(tx, dto.shopId, dto.productId);
            if (avail.lt(new client_1.Prisma.Decimal(dto.damagedQuantity))) {
                const product = await tx.product.findUnique({ where: { id: dto.productId } });
                throw new domain_exceptions_1.InsufficientStockException('Insufficient stock', [
                    {
                        productId: dto.productId,
                        productCode: product?.productCode ?? dto.productId,
                        available: avail.toString(),
                        requested: String(dto.damagedQuantity),
                    },
                ]);
            }
            const damageNumber = await this.numbers.nextNumber(tx, {
                shopId: dto.shopId,
                docType: 'DM',
                prefix: 'DM',
                date: damageDate,
            });
            return tx.damagedStock.create({
                data: {
                    damageNumber,
                    damageDate,
                    shopId: dto.shopId,
                    productId: dto.productId,
                    damagedQuantity: new client_1.Prisma.Decimal(dto.damagedQuantity),
                    reason: dto.reason.trim(),
                    remarks: dto.remarks?.trim(),
                    status: client_1.DocumentStatus.DRAFT,
                    createdById: user.id,
                },
                include: { product: true, shop: true },
            });
        });
    }
    async get(user, id) {
        const row = await this.prisma.damagedStock.findUnique({
            where: { id },
            include: { product: true, shop: true },
        });
        if (!row)
            throw new common_1.NotFoundException('Not found');
        (0, shop_scope_1.assertShopScope)(user, row.shopId);
        return row;
    }
    async update(user, id, dto) {
        const existing = await this.get(user, id);
        if (existing.status !== client_1.DocumentStatus.DRAFT)
            throw new common_1.BadRequestException('Only DRAFT can be edited');
        if (dto.shopId)
            (0, shop_scope_1.assertShopScope)(user, dto.shopId);
        const damageDate = dto.damageDate ? new Date(dto.damageDate) : existing.damageDate;
        (0, date_guards_1.assertNotFuture)(damageDate);
        return this.prisma.$transaction(async (tx) => {
            const qty = dto.damagedQuantity ?? Number(existing.damagedQuantity);
            const shopId = dto.shopId ?? existing.shopId;
            const productId = dto.productId ?? existing.productId;
            if (qty <= 0)
                throw new common_1.BadRequestException('Quantity must be > 0');
            const avail = await this.available(tx, shopId, productId);
            if (avail.lt(new client_1.Prisma.Decimal(qty))) {
                const product = await tx.product.findUnique({ where: { id: productId } });
                throw new domain_exceptions_1.InsufficientStockException('Insufficient stock', [
                    {
                        productId,
                        productCode: product?.productCode ?? productId,
                        available: avail.toString(),
                        requested: String(qty),
                    },
                ]);
            }
            return tx.damagedStock.update({
                where: { id },
                data: {
                    damageDate,
                    shopId: dto.shopId ?? undefined,
                    productId: dto.productId ?? undefined,
                    damagedQuantity: dto.damagedQuantity !== undefined ? new client_1.Prisma.Decimal(dto.damagedQuantity) : undefined,
                    reason: dto.reason?.trim(),
                    remarks: dto.remarks?.trim(),
                    updatedById: user.id,
                },
                include: { product: true, shop: true },
            });
        });
    }
    async post(user, id) {
        const row = await this.get(user, id);
        if (row.status === client_1.DocumentStatus.POSTED)
            throw new domain_exceptions_1.DocumentAlreadyPostedException();
        (0, date_guards_1.assertNotFuture)(row.damageDate);
        return this.prisma.$transaction(async (tx) => {
            const fresh = await tx.damagedStock.findUnique({ where: { id } });
            if (!fresh || fresh.status !== client_1.DocumentStatus.DRAFT)
                throw new domain_exceptions_1.DocumentAlreadyPostedException();
            const avail = await this.available(tx, fresh.shopId, fresh.productId);
            if (avail.lt(fresh.damagedQuantity)) {
                const product = await tx.product.findUnique({ where: { id: fresh.productId } });
                throw new domain_exceptions_1.InsufficientStockException('Insufficient stock for posting', [
                    {
                        productId: fresh.productId,
                        productCode: product?.productCode ?? fresh.productId,
                        available: avail.toString(),
                        requested: fresh.damagedQuantity.toString(),
                    },
                ]);
            }
            const beforeQty = Number(avail);
            const transitioned = await tx.damagedStock.updateMany({
                where: { id, status: client_1.DocumentStatus.DRAFT },
                data: { status: client_1.DocumentStatus.POSTED, postedAt: new Date(), updatedById: user.id },
            });
            if (transitioned.count === 0) {
                throw new domain_exceptions_1.DocumentAlreadyPostedException();
            }
            await this.stock.postMovementOnce(tx, {
                type: client_1.TransactionType.DAMAGE,
                ref: fresh.damageNumber,
                date: fresh.damageDate,
                shopId: fresh.shopId,
                productId: fresh.productId,
                inQty: 0,
                outQty: fresh.damagedQuantity,
                sourceType: 'GOODS_RETURN',
                sourceId: fresh.id,
                idempotencyKey: `dm:${fresh.id}`,
                userId: user.id,
            });
            const afterSummary = await tx.stockSummary.findUnique({
                where: { shopId_productId: { shopId: fresh.shopId, productId: fresh.productId } },
            });
            const afterQty = Number(afterSummary?.currentStock ?? 0);
            const delta = -Number(fresh.damagedQuantity);
            const posted = await tx.damagedStock.findUniqueOrThrow({
                where: { id },
                include: { product: true, shop: true },
            });
            const shop = await tx.shop.findUnique({ where: { id: posted.shopId }, select: { companyId: true } });
            if (shop?.companyId) {
                await this.audit.log((0, inventory_audit_1.buildStockAdjustmentAudit)({
                    companyId: shop.companyId,
                    userId: user.id,
                    productId: fresh.productId,
                    warehouseId: fresh.shopId,
                    adjustmentType: 'LOSS',
                    reason: fresh.reason,
                    beforeQty,
                    delta,
                    afterQty,
                    referenceNo: fresh.damageNumber,
                }), tx);
            }
            await this.audit.logTenant(user, {
                action: client_1.AuditAction.POST,
                entityType: 'DAMAGED_STOCK',
                entityId: posted.id,
                newValues: {
                    damageNumber: posted.damageNumber,
                    status: posted.status,
                    damagedQuantity: posted.damagedQuantity.toString(),
                },
            }, tx);
            return posted;
        });
    }
    async print(user, id) {
        const row = await this.get(user, id);
        const tpl = Handlebars.compile(`<!doctype html><html><head><meta charset="utf-8"><title>{{no}}</title>
      <style>body{font-family:Arial;padding:24px}</style></head><body>
      <h2>Damaged Stock {{no}}</h2>
      <p>Date: {{d}} | Shop: {{shop}} | Product: {{code}} | Qty: {{qty}}</p>
      <p>Reason: {{reason}}</p>
      </body></html>`);
        return tpl({
            no: row.damageNumber,
            d: row.damageDate.toISOString().slice(0, 10),
            shop: row.shop.shopName,
            code: row.product.productCode,
            qty: row.damagedQuantity.toString(),
            reason: row.reason,
        });
    }
};
exports.DamagedStockService = DamagedStockService;
exports.DamagedStockService = DamagedStockService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stock_service_1.StockService,
        document_number_service_1.DocumentNumberService,
        audit_service_1.AuditService])
], DamagedStockService);
//# sourceMappingURL=damaged-stock.service.js.map