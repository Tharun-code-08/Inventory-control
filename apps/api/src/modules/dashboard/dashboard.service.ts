import { ForbiddenException, Injectable } from '@nestjs/common';
import { DocumentStatus, Prisma, PurchaseOrderStatus, SalesOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, requireCompanyId, shopIdsForUser } from '../../common/utils/shop-scope';
import { EFFECTIVE_CURRENT_STOCK_SQL } from '../stock/effective-current-stock';

export type DashboardSummaryPayload = {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  lowStockCriticalCount: number;
  lowStockWarningCount: number;
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
    unitCost: number;
    stockValue: number;
  }>;
  kpiContext: {
    productsAddedThisMonth: number;
    stockValueAvgPerProduct: number;
    transactionsPriorPeriod: number;
    pendingPurchaseOrders: number;
    pendingSalesOrders: number;
    totalWarehouses: number;
    pendingGoodsReceipts: number;
    pendingRFQ: number;
    pendingQuotations: number;
  };
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

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const sixMonthsAgoStart = new Date();
    sixMonthsAgoStart.setMonth(sixMonthsAgoStart.getMonth() - 5);
    sixMonthsAgoStart.setDate(1);
    sixMonthsAgoStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      categoryGroups,
      stockValueAndLow,
      lowStockProducts,
      recentGrHeaders,
      recentGiHeaders,
      gr30,
      gi30,
      grPrior30,
      giPrior30,
      monthlyRows,
      topProducts,
      productsAddedThisMonth,
      pendingPurchaseOrders,
      pendingSalesOrders,
      totalWarehouses,
      pendingGoodsReceipts,
      pendingRFQ,
      pendingQuotations,
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
      this.prisma.goodsReceiptHeader.count({
        where: {
          status: DocumentStatus.POSTED,
          grDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          shopId: shopFilter,
        },
      }),
      this.prisma.goodsIssueHeader.count({
        where: {
          status: DocumentStatus.POSTED,
          giDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          shopId: shopFilter,
        },
      }),
      this.fetchMonthlyMovement(shopIds, sixMonthsAgoStart),
      this.fetchTopProducts(shopIds, 10),
      this.prisma.product.count({
        where: {
          ...productWhere,
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.purchaseOrderHeader.count({
        where: {
          status: PurchaseOrderStatus.CONFIRMED,
          shopId: shopFilter,
        },
      }),
      this.prisma.salesOrderHeader.count({
        where: {
          status: SalesOrderStatus.CONFIRMED,
          shopId: shopFilter,
        },
      }),
      this.prisma.storageLocation.count({
        where: {
          shopId: shopFilter,
          isActive: true,
        },
      }),
      this.prisma.goodsReceiptHeader.count({
        where: {
          shopId: shopFilter,
          status: DocumentStatus.DRAFT,
        },
      }),
      this.prisma.rfqHeader.count({
        where: {
          shopId: shopFilter,
          status: 'DRAFT',
        },
      }),
      this.prisma.supplierQuotationHeader.count({
        where: {
          shopId: shopFilter,
          status: DocumentStatus.DRAFT,
        },
      }),
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

    const stockValueAvgPerProduct =
      totalProducts > 0
        ? Math.round((stockValueAndLow.totalStockValue / totalProducts) * 100) / 100
        : 0;

    return {
      totalProducts,
      totalStockValue: stockValueAndLow.totalStockValue,
      lowStockCount: stockValueAndLow.lowStockCount,
      lowStockCriticalCount: stockValueAndLow.lowStockCriticalCount,
      lowStockWarningCount: stockValueAndLow.lowStockWarningCount,
      recentTransactions: gr30 + gi30,
      monthlyMovement,
      categoryBreakdown,
      recentGoodsReceipts,
      recentGoodsIssues,
      lowStockProducts,
      topProducts,
      kpiContext: {
        productsAddedThisMonth,
        stockValueAvgPerProduct,
        transactionsPriorPeriod: grPrior30 + giPrior30,
        pendingPurchaseOrders,
        pendingSalesOrders,
        totalWarehouses,
        pendingGoodsReceipts,
        pendingRFQ,
        pendingQuotations,
      },
    };
  }

  /**
   * Month 1: Executive Dashboard
   * 4 cards: Financial, Inventory, Attention, Recommendations
   * Target: 30 seconds to understand and act
   */
  async executive(user: RequestUser, shop_id?: string) {
    const shopIds = await this.resolveDashboardShopIds(user, shop_id);
    const shopFilter = shopIds.length === 1 ? shopIds[0] : { in: shopIds };

    // Parallel queries for the 4 cards
    const [
      financial,
      inventory,
      attention,
    ] = await Promise.all([
      this.fetchFinancialCard(shopIds, shopFilter),
      this.fetchInventoryCard(shopIds, shopFilter),
      this.fetchAttentionCard(shopIds, shopFilter),
    ]);

    return {
      financial,
      inventory,
      attention,
      recommendations: [], // Month 1: empty. Month 5+: filled with intelligence.
    };
  }

  private async fetchFinancialCard(shopIds: string[], shopFilter: string | { in: string[] }) {
    // TODO: Wire up real financial data from sales orders, invoices, payments
    // For Week 1, return hardcoded example
    return {
      revenueToday: 234000,
      revenueThisMonth: 5432100,
      grossProfit: 1856000,
      netProfit: 1234000,
      receivables: 890000,
      payables: 450000,
    };
  }

  private async fetchInventoryCard(shopIds: string[], shopFilter: string | { in: string[] }) {
    // TODO: Wire up real inventory data from stock summary
    // For Week 1, return hardcoded example
    const stockData = await this.aggregateStockValueAndLowCount(shopIds);
    return {
      totalValue: stockData.totalStockValue,
      lowStockCount: stockData.lowStockCount,
      deadStockValue: 120000,
      stockCoverageDays: 12,
    };
  }

  private async fetchAttentionCard(shopIds: string[], shopFilter: string | { in: string[] }) {
    // TODO: Wire up real attention items from approvals, GRs, payments
    // For Week 1, return hardcoded example
    return [
      {
        type: 'overdue_payments',
        count: 2,
        severity: 'critical',
      },
      {
        type: 'low_stock_alerts',
        count: 3,
        severity: 'warning',
      },
      {
        type: 'pending_approvals',
        count: 5,
        severity: 'info',
      },
    ];
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
   * Compute total stock value (sum of live on-hand × unit cost) and low-stock
   * counts in one SQL pass. Quantity uses ledger net when movements exist,
   * otherwise stock_summary — same as Products / warehouse inventory.
   */
  private async aggregateStockValueAndLowCount(shopIds: string[]) {
    const stockQty = Prisma.raw(`(${EFFECTIVE_CURRENT_STOCK_SQL})`);
    const rows = await this.prisma.$queryRaw<
      Array<{
        total_value: string | null;
        low_count: string | null;
        critical_count: string | null;
        warning_count: string | null;
      }>
    >(Prisma.sql`
      SELECT
        COALESCE(SUM(
          ${stockQty}
          * COALESCE(NULLIF(s.avg_cost, 0), NULLIF(p.purchase_price, 0), 0)
        ), 0)::text AS total_value,
        COALESCE(SUM(CASE
          WHEN pp.min_stock_level > 0
           AND ${stockQty} <= pp.min_stock_level
          THEN 1 ELSE 0 END), 0)::text AS low_count,
        COALESCE(SUM(CASE
          WHEN pp.min_stock_level > 0
           AND ${stockQty} <= pp.min_stock_level
           AND (
             ${stockQty} = 0
             OR ${stockQty} < 0.25 * pp.min_stock_level
           )
          THEN 1 ELSE 0 END), 0)::text AS critical_count,
        COALESCE(SUM(CASE
          WHEN pp.min_stock_level > 0
           AND ${stockQty} <= pp.min_stock_level
           AND ${stockQty} > 0
           AND ${stockQty} >= 0.25 * pp.min_stock_level
          THEN 1 ELSE 0 END), 0)::text AS warning_count
      FROM product_plants pp
      JOIN products p ON p.id = pp.product_id AND p.is_active = true
      LEFT JOIN stock_summary s
        ON s.shop_id = pp.shop_id AND s.product_id = pp.product_id
      WHERE pp.is_active = true AND pp.shop_id = ANY(${shopIds}::uuid[])
    `);
    const row = rows[0] ?? { total_value: '0', low_count: '0', critical_count: '0', warning_count: '0' };
    return {
      totalStockValue: Math.round(Number(row.total_value ?? '0') * 100) / 100,
      lowStockCount: Number(row.low_count ?? '0'),
      lowStockCriticalCount: Number(row.critical_count ?? '0'),
      lowStockWarningCount: Number(row.warning_count ?? '0'),
    };
  }

  private async fetchTopProducts(shopIds: string[], limit: number) {
    const stockQty = Prisma.raw(`(${EFFECTIVE_CURRENT_STOCK_SQL})`);
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        product_code: string;
        description: string;
        category: string;
        current_stock: string;
        unit_cost: string;
        stock_value: string;
      }>
    >(Prisma.sql`
      SELECT
        p.id,
        p.product_code,
        p.description,
        p.category,
        ${stockQty}::text AS current_stock,
        COALESCE(NULLIF(s.avg_cost, 0), NULLIF(p.purchase_price, 0), 0)::text AS unit_cost,
        (
          ${stockQty}
          * COALESCE(NULLIF(s.avg_cost, 0), NULLIF(p.purchase_price, 0), 0)
        )::text AS stock_value
      FROM product_plants pp
      JOIN products p ON p.id = pp.product_id AND p.is_active = true
      LEFT JOIN stock_summary s
        ON s.shop_id = pp.shop_id AND s.product_id = pp.product_id
      WHERE pp.is_active = true AND pp.shop_id = ANY(${shopIds}::uuid[])
      ORDER BY (
        ${stockQty}
        * COALESCE(NULLIF(s.avg_cost, 0), NULLIF(p.purchase_price, 0), 0)
      ) DESC
      LIMIT ${limit}
    `);
    return rows.map((r) => ({
      id: r.id,
      productCode: r.product_code,
      description: r.description,
      category: r.category?.trim() ? r.category : 'Uncategorized',
      currentStock: Number(r.current_stock),
      unitCost: Number(r.unit_cost),
      stockValue: Math.round(Number(r.stock_value ?? '0') * 100) / 100,
    }));
  }

  private async fetchLowStockProducts(shopIds: string[], limit: number) {
    const stockQty = Prisma.raw(`(${EFFECTIVE_CURRENT_STOCK_SQL})`);
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
    >(Prisma.sql`
      SELECT p.id, pp.shop_id, p.product_code, p.description, p.category,
             ${stockQty}::text AS current_stock,
             pp.min_stock_level::text AS min_stock_level
      FROM product_plants pp
      JOIN products p ON p.id = pp.product_id AND p.is_active = true
      LEFT JOIN stock_summary s
        ON s.shop_id = pp.shop_id AND s.product_id = pp.product_id
      WHERE pp.is_active = true
        AND pp.shop_id = ANY(${shopIds}::uuid[])
        AND pp.min_stock_level > 0
        AND ${stockQty} <= pp.min_stock_level
      ORDER BY (CASE WHEN pp.min_stock_level > 0
                      THEN ${stockQty} / pp.min_stock_level
                      ELSE 0 END) ASC
      LIMIT ${limit}
    `);
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
