"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let CostingService = class CostingService {
    async recordInflow(tx, args) {
        const summary = await tx.stockSummary.findUnique({
            where: { shopId_productId: { shopId: args.shopId, productId: args.productId } },
        });
        const oldQty = summary?.currentStock ?? new client_1.Prisma.Decimal(0);
        const oldAvg = summary?.avgCost ?? new client_1.Prisma.Decimal(0);
        const totalQty = oldQty.add(args.qty);
        const newAvg = totalQty.gt(0)
            ? oldQty.mul(oldAvg).add(args.qty.mul(args.unitCost)).div(totalQty)
            : args.unitCost;
        if (summary) {
            await tx.stockSummary.update({
                where: { shopId_productId: { shopId: args.shopId, productId: args.productId } },
                data: { avgCost: newAvg },
            });
        }
        else {
        }
        if (args.method === client_1.CostingMethod.FIFO) {
            await tx.costLayer.create({
                data: {
                    shopId: args.shopId,
                    productId: args.productId,
                    grId: args.grId ?? null,
                    ledgerId: args.ledgerId ?? null,
                    qtyRemaining: args.qty,
                    qtyOriginal: args.qty,
                    unitCost: args.unitCost,
                },
            });
        }
    }
    async recordOutflow(tx, args) {
        if (args.qty.lte(0)) {
            return { totalCost: new client_1.Prisma.Decimal(0), unitCost: new client_1.Prisma.Decimal(0) };
        }
        if (args.method === client_1.CostingMethod.AVERAGE) {
            const summary = await tx.stockSummary.findUnique({
                where: { shopId_productId: { shopId: args.shopId, productId: args.productId } },
            });
            const avg = summary?.avgCost ?? new client_1.Prisma.Decimal(0);
            return { totalCost: args.qty.mul(avg), unitCost: avg };
        }
        const layers = await tx.costLayer.findMany({
            where: { shopId: args.shopId, productId: args.productId, qtyRemaining: { gt: 0 } },
            orderBy: { createdAt: 'asc' },
        });
        let remaining = new client_1.Prisma.Decimal(args.qty);
        let totalCost = new client_1.Prisma.Decimal(0);
        for (const layer of layers) {
            if (remaining.lte(0))
                break;
            const take = client_1.Prisma.Decimal.min(remaining, layer.qtyRemaining);
            totalCost = totalCost.add(take.mul(layer.unitCost));
            const newRemaining = layer.qtyRemaining.sub(take);
            await tx.costLayer.update({
                where: { id: layer.id },
                data: { qtyRemaining: newRemaining },
            });
            remaining = remaining.sub(take);
        }
        if (remaining.gt(0)) {
            const summary = await tx.stockSummary.findUnique({
                where: { shopId_productId: { shopId: args.shopId, productId: args.productId } },
            });
            const avg = summary?.avgCost ?? new client_1.Prisma.Decimal(0);
            totalCost = totalCost.add(remaining.mul(avg));
        }
        const unitCost = args.qty.gt(0) ? totalCost.div(args.qty) : new client_1.Prisma.Decimal(0);
        return { totalCost, unitCost };
    }
};
exports.CostingService = CostingService;
exports.CostingService = CostingService = __decorate([
    (0, common_1.Injectable)()
], CostingService);
//# sourceMappingURL=costing.service.js.map