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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
function endOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async summary(user, shop_id) {
        const shopScope = (0, shop_scope_1.defaultShopFilter)(user);
        const shopId = shopScope ?? shop_id;
        if (shop_id)
            (0, shop_scope_1.assertShopScope)(user, shop_id);
        const productWhere = {
            isActive: true,
            ...(shopId ? { shopId } : {}),
        };
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [totalProducts, products, catGroups, recentGrHeaders, recentGiHeaders] = await Promise.all([
            this.prisma.product.count({ where: productWhere }),
            this.prisma.product.findMany({
                where: productWhere,
                include: { stockSummaries: true },
            }),
            this.prisma.product.groupBy({
                by: ['category'],
                where: productWhere,
                _count: { _all: true },
            }),
            this.prisma.goodsReceiptHeader.findMany({
                where: shopId ? { shopId } : {},
                orderBy: { grDate: 'desc' },
                take: 5,
                include: { items: { select: { lineValue: true } } },
            }),
            this.prisma.goodsIssueHeader.findMany({
                where: shopId ? { shopId } : {},
                orderBy: { giDate: 'desc' },
                take: 5,
            }),
        ]);
        let totalStockValue = 0;
        const lowCandidates = [];
        for (const p of products) {
            const stockRow = p.stockSummaries.find((s) => s.shopId === p.shopId);
            const qty = Number(stockRow?.currentStock ?? 0);
            const minLevel = Number(p.minStockLevel);
            const unitValue = Number(p.sellingPrice);
            totalStockValue += qty * unitValue;
            if (qty < minLevel) {
                lowCandidates.push({
                    id: p.id,
                    productCode: p.productCode,
                    description: p.description,
                    currentStock: qty,
                    minStockLevel: minLevel,
                });
            }
        }
        lowCandidates.sort((a, b) => {
            const ra = a.minStockLevel > 0 ? a.currentStock / a.minStockLevel : 0;
            const rb = b.minStockLevel > 0 ? b.currentStock / b.minStockLevel : 0;
            return ra - rb;
        });
        const lowStockProducts = lowCandidates.slice(0, 10);
        const lowStockCount = lowCandidates.length;
        const [gr30, gi30] = await Promise.all([
            this.prisma.goodsReceiptHeader.count({
                where: {
                    status: client_1.DocumentStatus.POSTED,
                    grDate: { gte: thirtyDaysAgo },
                    ...(shopId ? { shopId } : {}),
                },
            }),
            this.prisma.goodsIssueHeader.count({
                where: {
                    status: client_1.DocumentStatus.POSTED,
                    giDate: { gte: thirtyDaysAgo },
                    ...(shopId ? { shopId } : {}),
                },
            }),
        ]);
        const recentTransactions = gr30 + gi30;
        const now = new Date();
        const monthlyMovement = [];
        for (let i = 5; i >= 0; i -= 1) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = endOfMonth(start);
            const grWhere = {
                status: client_1.DocumentStatus.POSTED,
                grDate: { gte: start, lte: end },
                ...(shopId ? { shopId } : {}),
            };
            const giWhere = {
                status: client_1.DocumentStatus.POSTED,
                giDate: { gte: start, lte: end },
                ...(shopId ? { shopId } : {}),
            };
            const [receipts, issues] = await Promise.all([
                this.prisma.goodsReceiptHeader.count({ where: grWhere }),
                this.prisma.goodsIssueHeader.count({ where: giWhere }),
            ]);
            monthlyMovement.push({
                month: start.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
                receipts,
                issues,
            });
        }
        const categoryBreakdown = catGroups.map((g) => ({
            category: g.category?.trim() ? g.category : 'Uncategorized',
            count: g._count._all,
        }));
        const recentGoodsReceipts = recentGrHeaders.map((gr) => ({
            id: gr.id,
            grNumber: gr.grNumber,
            grDate: gr.grDate.toISOString(),
            supplier: gr.supplierName,
            totalValue: gr.items.reduce((sum, line) => sum + Number(line.lineValue), 0),
            status: gr.status,
        }));
        const recentGoodsIssues = recentGiHeaders.map((gi) => ({
            id: gi.id,
            giNumber: gi.giNumber,
            giDate: gi.giDate.toISOString(),
            issueReason: gi.issueReason,
            status: gi.status,
        }));
        return {
            totalProducts,
            totalStockValue: Math.round(totalStockValue * 100) / 100,
            lowStockCount,
            recentTransactions,
            monthlyMovement,
            categoryBreakdown,
            recentGoodsReceipts,
            recentGoodsIssues,
            lowStockProducts,
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map