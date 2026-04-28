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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const shop_scope_1 = require("../../common/utils/shop-scope");
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    resolveDateRange(dateFrom, dateTo) {
        const now = new Date();
        const fallbackTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const fallbackFrom = new Date(fallbackTo);
        fallbackFrom.setDate(fallbackFrom.getDate() - 30);
        fallbackFrom.setHours(0, 0, 0, 0);
        const from = dateFrom ? new Date(dateFrom) : fallbackFrom;
        const to = dateTo ? new Date(dateTo) : fallbackTo;
        const validFrom = Number.isNaN(from.getTime()) ? fallbackFrom : from;
        const validTo = Number.isNaN(to.getTime()) ? fallbackTo : to;
        return validFrom <= validTo
            ? { from: validFrom, to: validTo }
            : { from: validTo, to: validFrom };
    }
    shop(user, shopId) {
        const scoped = (0, shop_scope_1.defaultShopFilter)(user) ?? shopId;
        if (shopId)
            (0, shop_scope_1.assertShopScope)(user, shopId);
        return scoped;
    }
    async inventory(user, filters) {
        const shopId = this.shop(user, filters.shop_id);
        const lowOnly = filters.low_stock_only === true;
        const rows = await this.prisma.product.findMany({
            where: {
                isActive: true,
                ...(shopId ? { shopId } : {}),
                ...(filters.category ? { category: filters.category } : {}),
            },
            include: { stockSummaries: true },
            orderBy: { productCode: 'asc' },
        });
        return rows
            .map((p) => {
            const summary = p.stockSummaries.find((s) => s.shopId === p.shopId);
            const current = summary?.currentStock ?? new client_1.Prisma.Decimal(0);
            return {
                product_id: p.id,
                product_code: p.productCode,
                description: p.description,
                shop_id: p.shopId,
                current_stock: current,
                min_stock_level: p.minStockLevel,
            };
        })
            .filter((r) => (lowOnly ? r.current_stock.lt(r.min_stock_level) : true));
    }
    async lowStock(user, shop_id) {
        const data = await this.inventory(user, { shop_id, low_stock_only: true });
        return data.map((r) => ({
            product_id: r.product_id,
            product_code: r.product_code,
            current_stock: r.current_stock,
            min_stock_level: r.min_stock_level,
        }));
    }
    async fastMoving(user, filters) {
        (0, shop_scope_1.assertShopScope)(user, filters.shop_id);
        const limit = Math.min(Math.max(filters.limit ?? 20, 1), 200);
        return this.prisma.$queryRaw(client_1.Prisma.sql `
      WITH bounds AS (
        SELECT ${filters.shop_id}::uuid as shop_id,
               ${filters.date_from}::date as d_from,
               ${filters.date_to}::date as d_to,
               GREATEST(1, (${filters.date_to}::date - ${filters.date_from}::date) + 1) as days_in_period
      ),
      issued AS (
        SELECT sl.product_id, SUM(sl.out_qty)::numeric as total_issued_qty
        FROM stock_ledger sl, bounds b
        WHERE sl.transaction_type = 'GOODS_ISSUE'
          AND sl.shop_id = b.shop_id
          AND sl.transaction_date BETWEEN b.d_from AND b.d_to
        GROUP BY sl.product_id
      ),
      vel AS (
        SELECT i.product_id, i.total_issued_qty,
               (i.total_issued_qty / b.days_in_period) as velocity
        FROM issued i CROSS JOIN bounds b
      ),
      ranked AS (
        SELECT v.*,
               NTILE(5) OVER (ORDER BY v.velocity ASC) as velocity_bucket
        FROM vel v
      )
      SELECT p.product_code, p.description, r.total_issued_qty, r.velocity,
             (r.velocity_bucket = 5) as is_top_velocity_decile
      FROM ranked r
      JOIN products p ON p.id = r.product_id AND p.shop_id = (SELECT shop_id FROM bounds)
      ORDER BY r.total_issued_qty DESC
      LIMIT ${limit}
    `);
    }
    async damagedRegister(user, shop_id) {
        const shopId = this.shop(user, shop_id);
        return this.prisma.damagedStock.findMany({
            where: shopId ? { shopId } : {},
            orderBy: { damageDate: 'desc' },
            include: { product: true, shop: true },
        });
    }
    async grRegister(user, date_from, date_to, shop_id) {
        const shopId = this.shop(user, shop_id);
        const { from, to } = this.resolveDateRange(date_from, date_to);
        return this.prisma.goodsReceiptHeader.findMany({
            where: {
                grDate: { gte: from, lte: to },
                ...(shopId ? { shopId } : {}),
            },
            orderBy: { grDate: 'desc' },
            include: { shop: true, items: true },
        });
    }
    async giRegister(user, date_from, date_to, shop_id) {
        const shopId = this.shop(user, shop_id);
        const { from, to } = this.resolveDateRange(date_from, date_to);
        return this.prisma.goodsIssueHeader.findMany({
            where: {
                giDate: { gte: from, lte: to },
                ...(shopId ? { shopId } : {}),
            },
            orderBy: { giDate: 'desc' },
            include: { shop: true, items: true },
        });
    }
    async stockLedger(user, product_id, date_from, date_to, shop_id) {
        const { from, to } = this.resolveDateRange(date_from, date_to);
        const scopedShopId = this.shop(user, shop_id);
        let validatedProductShopId;
        if (product_id) {
            const product = await this.prisma.product.findUnique({ where: { id: product_id } });
            if (!product)
                return [];
            (0, shop_scope_1.assertShopScope)(user, product.shopId);
            validatedProductShopId = product.shopId;
        }
        return this.prisma.stockLedger.findMany({
            where: {
                ...(product_id ? { productId: product_id } : {}),
                ...((validatedProductShopId ?? scopedShopId) ? { shopId: validatedProductShopId ?? scopedShopId } : {}),
                transactionDate: { gte: from, lte: to },
            },
            orderBy: { transactionDate: 'asc' },
        });
    }
    async shopSummary(user, shop_id) {
        const shopId = this.shop(user, shop_id);
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT sh.id as shop_id, sh.shop_name,
             COUNT(DISTINCT p.id)::int as sku_count,
             SUM(COALESCE(ss.current_stock,0) * p.purchase_price) as stock_value
      FROM shops sh
      LEFT JOIN products p ON p.shop_id = sh.id AND p.is_active = true
      LEFT JOIN stock_summary ss ON ss.shop_id = p.shop_id AND ss.product_id = p.id
      WHERE (${shopId ? client_1.Prisma.sql `sh.id = ${shopId}::uuid` : client_1.Prisma.sql `TRUE`})
      GROUP BY sh.id, sh.shop_name
      ORDER BY sh.shop_name ASC
    `);
        return rows.map((r) => ({
            shop_id: r.shop_id,
            shop_name: r.shop_name,
            sku_count: Number(r.sku_count ?? 0),
            stock_value: Number(r.stock_value ?? 0),
        }));
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map