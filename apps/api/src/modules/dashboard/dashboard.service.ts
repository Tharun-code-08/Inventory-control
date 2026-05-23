import { ForbiddenException, Injectable } from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, requireCompanyId, shopIdsForUser } from '../../common/utils/shop-scope';

export type DashboardSummaryPayload = {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  recentTransactions: number;
  monthlyMovement: { month: string; receipts: number; issues: number }[];
  categoryBreakdown: { category: string; count: number }[];
  recentGoodsReceipts: Array<{
    id: string;
    grNumber: string;
    grDate: string;
    supplier: string;
    totalValue: number;
    status: string;
  }>;
  recentGoodsIssues: Array<{
    id: string;
    giNumber: string;
    giDate: string;
    issueReason: string;
    status: string;
  }>;
  lowStockProducts: Array<{
    id: string;
    shopId: string;
    productCode: string;
    description: string;
    category: string;
    currentStock: number;
    minStockLevel: number;
  }>;
  topProducts: Array<{
    id: string;
    productCode: string;
    description: string;
    category: string;
    currentStock: number;
    sellingPrice: number;
    stockValue: number;
  }>;
};

type MonthlyRow = { month: Date; receipts: bigint; issues: bigint };

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: RequestUser, shop_id?: string): Promise<DashboardSummaryPayload> {
    const shopIds = await this.resolveDashboardShopIds(user, shop_id);
    const shopFilter = shopIds.length === 1 ? shopIds[0] : { in: shopIds };

    // The product master is now plant-agnostic; scope means products with at
    // least one assignment to the selected plant(s).
    const productWhere: Prisma.ProductWhereInput = {
      isActive: true,
      plants: {
        some:
          typeof shopFilter === 'string'
            ? { shopId: shopFilter }
            : { shopId: shopFilter },
      },
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixMonthsAgoStart = new Date();
    sixMonthsAgoStart.setMonth(sixMonthsAgoStart.getMonth() - 5);
    sixMonthsAgoStart.setDate(1);
    sixMonthsAgoStart.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      categoryGroups,
      stockValueAndLow,
      lowStockProducts,
      recentGrHeaders,
      recentGiHeaders,
      gr30,
      gi30,
      monthlyRows,
      topProducts,
    ] = await Promise.all([
      this.prisma.product.count({ where: productWhere }),
      this.prisma.product.groupBy({
        by: ['category'],
        where: productWhere,
        _count: { _all: true },
      }),
      this.aggregateStockValueAndLowCount(shopIds),
      this.fetchLowStockProducts(shopIds, 10),
      this.prisma.goodsReceiptHeader.findMany({
        where: { shopId: shopFilter },
        orderBy: { grDate: 'desc' },
        take: 5,
        select: {
          id: true,
          grNumber: true,
          grDate: true,
          supplierName: true,
          status: true,
          totalValue: true,
          items: { select: { lineValue: true } },
        },
      }),
      this.prisma.goodsIssueHeader.findMany({
        where: { shopId: shopFilter },
        orderBy: { giDate: 'desc' },
        take: 5,
        select: {
          id: true,
          giNumber: true,
          giDate: true,
          issueReason: true,
          status: true,
        },
      }),
      this.prisma.goodsReceiptHeader.count({
        where: {
          status: DocumentStatus.POSTED,
          grDate: { gte: thirtyDaysAgo },
          shopId: shopFilter,
        },
      }),
      this.prisma.goodsIssueHeader.count({
        where: {
          status: DocumentStatus.POSTED,
          giDate: { gte: thirtyDaysAgo },
          shopId: shopFilter,
        },
      }),
      this.fetchMonthlyMovement(shopIds, sixMonthsAgoStart),
      this.fetchTopProducts(shopIds, 10),
    ]);

    const monthlyMovement = this.formatMonthlyMovement(monthlyRows, sixMonthsAgoStart);
    const categoryBreakdown = categoryGroups.map((g) => ({
      category: g.category?.trim() ? g.category : 'Uncategorized',
      count: g._count._all,
    }));

    const recentGoodsReceipts = recentGrHeaders.map((gr) => ({
      id: gr.id,
      grNumber: gr.grNumber,
      grDate: gr.grDate.toISOString(),
      supplier: gr.supplierName,
      totalValue: gr.totalValue
        ? Number(gr.totalValue)
        : gr.items.reduce((sum, line) => sum + Number(line.lineValue), 0),
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
      totalStockValue: stockValueAndLow.totalStockValue,
      lowStockCount: stockValueAndLow.lowStockCount,
      recentTransactions: gr30 + gi30,
      monthlyMovement,
      categoryBreakdown,
      recentGoodsReceipts,
      recentGoodsIssues,
      lowStockProducts,
      topProducts,
    };
  }

  /**
   * Resolve which plant(s) the dashboard should aggregate. Mirrors product list
   * scoping: explicit shop_id, tenant shops, or all active plants in the company.
   */
  private async resolveDashboardShopIds(user: RequestUser, shop_id?: string): Promise<string[]> {
    if (shop_id) {
      assertShopScope(user, shop_id);
      return [shop_id];
    }
    const tenantShops = shopIdsForUser(user);
    if (tenantShops && tenantShops.length > 0) {
      return tenantShops;
    }
    if (user.companyId) {
      const companyId = requireCompanyId(user);
      const shops = await this.prisma.shop.findMany({
        where: { companyId, isActive: true },
        select: { id: true },
        orderBy: { shopName: 'asc' },
      });
      if (shops.length > 0) {
        return shops.map((s) => s.id);
      }
    }
    if (user.shopId) {
      return [user.shopId];
    }
    throw new ForbiddenException('Organisation scope is required');
  }

  /**
   * Compute total stock value (sum of selling_price * current_stock) and the
   * count of products below their min_stock_level in a single SQL pass instead
   * of materializing every product row in JS.
   */
  private async aggregateStockValueAndLowCount(shopIds: string[]) {
    // Multi-plant: each (product, plant) assignment is its own line, so we
    // pivot off product_plants instead of products. Min-stock comparisons
    // use the per-plant pp.min_stock_level threshold.
    const rows = await this.prisma.$queryRaw<Array<{ total_value: string | null; low_count: string | null }>>`
      SELECT
        COALESCE(SUM(p.selling_price * COALESCE(s.current_stock, 0)), 0)::text AS total_value,
        COALESCE(SUM(CASE WHEN COALESCE(s.current_stock, 0) < pp.min_stock_level THEN 1 ELSE 0 END), 0)::text AS low_count
      FROM product_plants pp
      JOIN products p ON p.id = pp.product_id AND p.is_active = true
      LEFT JOIN stock_summary s
        ON s.shop_id = pp.shop_id AND s.product_id = pp.product_id
      WHERE pp.is_active = true AND pp.shop_id = ANY(${shopIds}::uuid[])
    `;
    const row = rows[0] ?? { total_value: '0', low_count: '0' };
    return {
      totalStockValue: Math.round(Number(row.total_value ?? '0') * 100) / 100,
      lowStockCount: Number(row.low_count ?? '0'),
    };
  }

  private async fetchTopProducts(shopIds: string[], limit: number) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        product_code: string;
        description: string;
        category: string;
        current_stock: string;
        selling_price: string;
        stock_value: string;
      }>
    >`
      SELECT
        p.id,
        p.product_code,
        p.description,
        p.category,
        COALESCE(s.current_stock, 0)::text AS current_stock,
        p.selling_price::text AS selling_price,
        (p.selling_price * COALESCE(s.current_stock, 0))::text AS stock_value
      FROM product_plants pp
      JOIN products p ON p.id = pp.product_id AND p.is_active = true
      LEFT JOIN stock_summary s
        ON s.shop_id = pp.shop_id AND s.product_id = pp.product_id
      WHERE pp.is_active = true AND pp.shop_id = ANY(${shopIds}::uuid[])
      ORDER BY (p.selling_price * COALESCE(s.current_stock, 0)) DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      productCode: r.product_code,
      description: r.description,
      category: r.category?.trim() ? r.category : 'Uncategorized',
      currentStock: Number(r.current_stock),
      sellingPrice: Number(r.selling_price),
      stockValue: Math.round(Number(r.stock_value ?? '0') * 100) / 100,
    }));
  }

  private async fetchLowStockProducts(shopIds: string[], limit: number) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        shop_id: string;
        product_code: string;
        description: string;
        category: string;
        current_stock: string;
        min_stock_level: string;
      }>
    >`
      SELECT p.id, pp.shop_id, p.product_code, p.description, p.category,
             COALESCE(s.current_stock, 0)::text AS current_stock,
             pp.min_stock_level::text AS min_stock_level
      FROM product_plants pp
      JOIN products p ON p.id = pp.product_id AND p.is_active = true
      LEFT JOIN stock_summary s
        ON s.shop_id = pp.shop_id AND s.product_id = pp.product_id
      WHERE pp.is_active = true
        AND pp.shop_id = ANY(${shopIds}::uuid[])
        AND COALESCE(s.current_stock, 0) < pp.min_stock_level
      ORDER BY (CASE WHEN pp.min_stock_level > 0
                      THEN COALESCE(s.current_stock, 0) / pp.min_stock_level
                      ELSE 0 END) ASC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      shopId: r.shop_id,
      productCode: r.product_code,
      description: r.description,
      category: r.category?.trim() ? r.category : 'Uncategorized',
      currentStock: Number(r.current_stock),
      minStockLevel: Number(r.min_stock_level),
    }));
  }

  /**
   * Single grouped query for the last 6 months of GR/GI POSTED counts.
   */
  private async fetchMonthlyMovement(shopIds: string[], sinceMonthStart: Date) {
    const rows = await this.prisma.$queryRaw<MonthlyRow[]>`
      WITH months AS (
        SELECT generate_series(${sinceMonthStart}::date, now()::date, interval '1 month')::date AS month
      )
      SELECT
        m.month,
        COALESCE((
          SELECT COUNT(*) FROM goods_receipt_header gr
          WHERE gr.status = 'POSTED'
            AND gr.shop_id = ANY(${shopIds}::uuid[])
            AND date_trunc('month', gr.gr_date) = m.month
        ), 0)::bigint AS receipts,
        COALESCE((
          SELECT COUNT(*) FROM goods_issue_header gi
          WHERE gi.status = 'POSTED'
            AND gi.shop_id = ANY(${shopIds}::uuid[])
            AND date_trunc('month', gi.gi_date) = m.month
        ), 0)::bigint AS issues
      FROM months m
      ORDER BY m.month ASC
    `;
    return rows;
  }

  private formatMonthlyMovement(rows: MonthlyRow[], expectedStart: Date) {
    if (rows.length > 0) {
      return rows.map((row) => ({
        month: row.month.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        receipts: Number(row.receipts),
        issues: Number(row.issues),
      }));
    }
    // Fallback: fill 6 zero months when generate_series isn't available.
    const out: { month: string; receipts: number; issues: number }[] = [];
    const cursor = new Date(expectedStart);
    for (let i = 0; i < 6; i += 1) {
      out.push({
        month: cursor.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        receipts: 0,
        issues: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }
}
