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
exports.StockService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
function isUniqueViolation(error) {
    return (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002');
}
let StockService = class StockService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    buildRemarks(payload) {
        const audit = {
            sourceType: payload.sourceType ?? payload.type,
            sourceId: payload.sourceId ?? payload.ref,
            sourceLineId: payload.sourceLineId ?? null,
        };
        const existing = payload.remarks?.trim();
        return existing ? `${existing} | ${JSON.stringify(audit)}` : JSON.stringify(audit);
    }
    async postMovement(tx, payload) {
        const inQty = new client_1.Prisma.Decimal(payload.inQty);
        const outQty = new client_1.Prisma.Decimal(payload.outQty);
        let value = null;
        let unitRate = null;
        if (payload.unitRate !== undefined) {
            unitRate = new client_1.Prisma.Decimal(payload.unitRate);
            if (inQty.gt(0)) {
                value = unitRate.mul(inQty);
            }
            else if (outQty.gt(0)) {
                value = unitRate.mul(outQty);
            }
        }
        return tx.stockLedger.create({
            data: {
                transactionType: payload.type,
                transactionRef: payload.ref,
                transactionDate: payload.date,
                shopId: payload.shopId,
                productId: payload.productId,
                inQty,
                outQty,
                balanceQty: new client_1.Prisma.Decimal(0),
                unitRate,
                value,
                remarks: this.buildRemarks(payload),
                idempotencyKey: payload.idempotencyKey ?? null,
                createdById: payload.userId,
            },
        });
    }
    async postMovementOnce(tx, payload) {
        const key = payload.idempotencyKey ??
            `${payload.type}:${payload.ref}:${payload.productId}:${String(payload.inQty)}:${String(payload.outQty)}`;
        try {
            return await this.postMovement(tx, { ...payload, idempotencyKey: key });
        }
        catch (err) {
            if (isUniqueViolation(err)) {
                const existing = await tx.stockLedger.findUnique({ where: { idempotencyKey: key } });
                if (existing)
                    return existing;
            }
            throw err;
        }
    }
    async buildStockBalanceMap(tx, productIds, shopIds) {
        if (productIds.length === 0) {
            return new Map();
        }
        const [summaryRows, ledgerRows] = await Promise.all([
            tx.stockSummary.findMany({
                where: {
                    productId: { in: productIds },
                    ...(shopIds?.length ? { shopId: { in: shopIds } } : {}),
                },
                select: { productId: true, shopId: true, currentStock: true },
            }),
            tx.stockLedger.groupBy({
                by: ['productId', 'shopId'],
                where: {
                    productId: { in: productIds },
                    ...(shopIds?.length ? { shopId: { in: shopIds } } : {}),
                },
                _sum: { inQty: true, outQty: true },
            }),
        ]);
        const balances = new Map();
        for (const row of summaryRows) {
            balances.set(`${row.productId}:${row.shopId}`, Number(row.currentStock));
        }
        for (const row of ledgerRows) {
            const inQty = Number(row._sum.inQty ?? 0);
            const outQty = Number(row._sum.outQty ?? 0);
            balances.set(`${row.productId}:${row.shopId}`, inQty - outQty);
        }
        return balances;
    }
    async resolveBalance(tx, shopId, productId) {
        const ledger = await tx.stockLedger.aggregate({
            where: { shopId, productId },
            _sum: { inQty: true, outQty: true },
            _count: { _all: true },
        });
        if ((ledger._count._all ?? 0) > 0) {
            const inQty = ledger._sum.inQty ?? new client_1.Prisma.Decimal(0);
            const outQty = ledger._sum.outQty ?? new client_1.Prisma.Decimal(0);
            return inQty.sub(outQty);
        }
        const summary = await tx.stockSummary.findUnique({
            where: { shopId_productId: { shopId, productId } },
            select: { currentStock: true },
        });
        return summary?.currentStock ?? new client_1.Prisma.Decimal(0);
    }
    async reconcile(shopId) {
        const rows = await this.prisma.stockSummary.findMany({
            where: shopId ? { shopId } : undefined,
            include: { product: true },
            take: 2000,
        });
        const ledgerSums = await this.prisma.stockLedger.groupBy({
            by: ['shopId', 'productId'],
            where: shopId ? { shopId } : undefined,
            _sum: { inQty: true, outQty: true },
        });
        const ledgerMap = new Map();
        for (const sum of ledgerSums) {
            const key = `${sum.shopId}:${sum.productId}`;
            const inQty = sum._sum.inQty ?? new client_1.Prisma.Decimal(0);
            const outQty = sum._sum.outQty ?? new client_1.Prisma.Decimal(0);
            ledgerMap.set(key, inQty.sub(outQty));
        }
        const discrepancies = [];
        for (const row of rows) {
            const ledgerQty = ledgerMap.get(`${row.shopId}:${row.productId}`) ?? new client_1.Prisma.Decimal(0);
            const delta = new client_1.Prisma.Decimal(row.currentStock).sub(ledgerQty);
            if (!delta.eq(0)) {
                discrepancies.push({
                    shopId: row.shopId,
                    productId: row.productId,
                    productCode: row.product.productCode,
                    summaryQty: row.currentStock.toString(),
                    ledgerQty: ledgerQty.toString(),
                    delta: delta.toString(),
                });
            }
        }
        return {
            checked: rows.length,
            discrepanciesCount: discrepancies.length,
            discrepancies,
        };
    }
};
exports.StockService = StockService;
exports.StockService = StockService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StockService);
//# sourceMappingURL=stock.service.js.map