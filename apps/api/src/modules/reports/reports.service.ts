import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  DocumentEmailStatus,
  DocumentStatus,
  Prisma,
  PurchaseOrderStatus,
  SalesOrderStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, requireCompanyId, shopIdsForUser, shopListWhere } from '../../common/utils/shop-scope';
import { SubscriptionService } from '../billing/subscription.service';
import { StockService } from '../stock/stock.service';
import { effectiveCurrentStockExpr } from '../stock/effective-current-stock';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
    private readonly stock: StockService,
  ) {}

  private async assertReportsAllowed(user: RequestUser) {
    const companyId = requireCompanyId(user);
    if (companyId) {
      await this.subscriptions.assertFeature(companyId, 'reports');
    }
  }

  private resolveDateRange(dateFrom?: string, dateTo?: string) {
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

  private async resolveShopIds(user: RequestUser, shopId?: string): Promise<string[]> {
    if (shopId) {
      assertShopScope(user, shopId);
      return [shopId];
    }
    const tenantShops = shopIdsForUser(user) ?? [];
    if (tenantShops.length === 0) {
      throw new ForbiddenException('Organisation scope is required');
    }
    return tenantShops;
  }

  private shopWhere(user: RequestUser, shopId?: string): Prisma.ShopWhereInput {
    if (shopId) assertShopScope(user, shopId);
    if (shopId) {
      return { ...shopListWhere(user), id: shopId };
    }
    return shopListWhere(user);
  }

  async inventory(user: RequestUser, filters: { shop_id?: string; category?: string; low_stock_only?: boolean }) {
    await this.assertReportsAllowed(user);
    const shopWhere = this.shopWhere(user, filters.shop_id);
    const lowOnly = filters.low_stock_only === true;
    // Inventory is now per-plant. Drive the listing off ProductPlant so each
    // assignment becomes one row, even when a single Product is stocked at
    // many plants. Stock summary lookups stay (shopId, productId)-keyed.
    const assignments = await this.prisma.productPlant.findMany({
      where: {
        isActive: true,
        product: {
          isActive: true,
          ...(filters.category ? { category: filters.category } : {}),
        },
        shop: shopWhere,
      },
      include: {
        product: { select: { id: true, productCode: true, description: true, category: true } },
        shop: { select: { id: true } },
      },
      orderBy: [{ product: { productCode: 'asc' } }, { shopId: 'asc' }],
    });

    const productIds = [...new Set(assignments.map((a) => a.productId))];
    const shopIds = [...new Set(assignments.map((a) => a.shopId))];
    const stockByKey = await this.stock.buildStockBalanceMap(this.prisma, productIds, shopIds);

    return assignments
      .map((a) => ({
        product_id: a.productId,
        product_code: a.product.productCode,
        description: a.product.description,
        category: a.product.category,
        shop_id: a.shopId,
        current_stock: new Prisma.Decimal(
          stockByKey.get(`${a.productId}:${a.shopId}`) ?? 0,
        ),
        min_stock_level: a.minStockLevel,
      }))
      .filter((r) =>
        lowOnly
          ? r.min_stock_level.gt(0) && r.current_stock.lte(r.min_stock_level)
          : true,
      );
  }

  async lowStock(user: RequestUser, shop_id?: string, category?: string) {
    const data = await this.inventory(user, { shop_id, category, low_stock_only: true });
    return data.map((r) => ({
      product_id: r.product_id,
      product_code: r.product_code,
      description: r.description,
      category: r.category,
      current_stock: r.current_stock,
      min_stock_level: r.min_stock_level,
    }));
  }

  async analyticsOverview(
    user: RequestUser,
    filters: { shop_id?: string; date_from?: string; date_to?: string },
  ) {
    await this.assertReportsAllowed(user);
    const shopIds = await this.resolveShopIds(user, filters.shop_id);
    const { from, to } = this.resolveDateRange(filters.date_from, filters.date_to);
    const shopArray = Prisma.sql`ARRAY[${Prisma.join(
      shopIds.map((id) => Prisma.sql`${id}::uuid`),
    )}]::uuid[]`;

    const stockExpr = effectiveCurrentStockExpr('ss');
    const [stockRows, poAgg, salesAgg, grCount, soCount] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{ stock_value: string | null; low_stock_count: string | null }>
      >(Prisma.sql`
        SELECT
          COALESCE(SUM((${stockExpr}) * p.purchase_price), 0)::text AS stock_value,
          COALESCE(SUM(CASE
            WHEN pp.min_stock_level > 0 AND (${stockExpr}) <= pp.min_stock_level
            THEN 1 ELSE 0 END), 0)::text AS low_stock_count
        FROM product_plants pp
        JOIN products p ON p.id = pp.product_id AND p.is_active = true
        LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
        WHERE pp.is_active = true AND pp.shop_id = ANY(${shopArray})
      `),
      this.prisma.purchaseOrderHeader.aggregate({
        _sum: { totalValue: true },
        _count: { _all: true },
        where: {
          shopId: { in: shopIds },
          poDate: { gte: from, lte: to },
          status: { not: PurchaseOrderStatus.CANCELLED },
        },
      }),
      this.prisma.salesOrderHeader.aggregate({
        _sum: { totalValue: true },
        _count: { _all: true },
        where: {
          shopId: { in: shopIds },
          orderDate: { gte: from, lte: to },
          status: { not: SalesOrderStatus.CANCELLED },
        },
      }),
      this.prisma.goodsReceiptHeader.count({
        where: {
          shopId: { in: shopIds },
          status: DocumentStatus.POSTED,
          grDate: { gte: from, lte: to },
        },
      }),
      this.prisma.salesOrderHeader.count({
        where: {
          shopId: { in: shopIds },
          orderDate: { gte: from, lte: to },
        },
      }),
    ]);

    const stockRow = stockRows[0] ?? { stock_value: '0', low_stock_count: '0' };

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      stockValue: Number(stockRow.stock_value ?? 0),
      lowStockCount: Number(stockRow.low_stock_count ?? 0),
      poValue: Number(poAgg._sum.totalValue ?? 0),
      poCount: poAgg._count._all,
      salesValue: Number(salesAgg._sum.totalValue ?? 0),
      salesCount: salesAgg._count._all,
      grCount,
      salesOrderCount: soCount,
    };
  }

  async purchaseOrderSummary(
    user: RequestUser,
    filters: {
      shop_id?: string;
      date_from?: string;
      date_to?: string;
      po_number?: string;
      supplier?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    await this.assertReportsAllowed(user);
    const shopIds = await this.resolveShopIds(user, filters.shop_id);
    const { from, to } = this.resolveDateRange(filters.date_from, filters.date_to);
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);

    const statusFilter = Object.values(PurchaseOrderStatus).includes(
      filters.status as PurchaseOrderStatus,
    )
      ? (filters.status as PurchaseOrderStatus)
      : undefined;

    const where: Prisma.PurchaseOrderHeaderWhereInput = {
      shopId: { in: shopIds },
      poDate: { gte: from, lte: to },
      ...(filters.po_number
        ? { poNumber: { contains: filters.po_number, mode: 'insensitive' } }
        : {}),
      ...(filters.supplier
        ? { supplier: { contains: filters.supplier, mode: 'insensitive' } }
        : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    const [rows, totalCount, totals, statusGroups] = await Promise.all([
      this.prisma.purchaseOrderHeader.findMany({
        where,
        orderBy: { poDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          poNumber: true,
          poDate: true,
          supplier: true,
          status: true,
          totalValue: true,
        },
      }),
      this.prisma.purchaseOrderHeader.count({ where }),
      this.prisma.purchaseOrderHeader.aggregate({
        _sum: { totalValue: true },
        _count: { _all: true },
        where,
      }),
      this.prisma.purchaseOrderHeader.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);

    const statusCounts = statusGroups.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    return {
      kpis: {
        totalCount: totals._count._all,
        totalValue: Number(totals._sum.totalValue ?? 0),
        confirmedCount: statusCounts[PurchaseOrderStatus.CONFIRMED] ?? 0,
        draftCount: statusCounts[PurchaseOrderStatus.DRAFT] ?? 0,
        cancelledCount: statusCounts[PurchaseOrderStatus.CANCELLED] ?? 0,
      },
      rows: rows.map((row) => ({
        id: row.id,
        poNumber: row.poNumber,
        poDate: row.poDate.toISOString(),
        supplier: row.supplier,
        status: row.status,
        totalValue: Number(row.totalValue ?? 0),
      })),
      pagination: { page, limit, totalCount },
    };
  }

  async salesOrderSummary(
    user: RequestUser,
    filters: {
      shop_id?: string;
      date_from?: string;
      date_to?: string;
      order_number?: string;
      customer?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    await this.assertReportsAllowed(user);
    const shopIds = await this.resolveShopIds(user, filters.shop_id);
    const { from, to } = this.resolveDateRange(filters.date_from, filters.date_to);
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);

    const statusFilter = Object.values(SalesOrderStatus).includes(
      filters.status as SalesOrderStatus,
    )
      ? (filters.status as SalesOrderStatus)
      : undefined;

    const where: Prisma.SalesOrderHeaderWhereInput = {
      shopId: { in: shopIds },
      orderDate: { gte: from, lte: to },
      ...(filters.order_number
        ? { soNumber: { contains: filters.order_number, mode: 'insensitive' } }
        : {}),
      ...(filters.customer
        ? { customer: { customerName: { contains: filters.customer, mode: 'insensitive' } } }
        : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    const [rows, totalCount, totals, statusGroups] = await Promise.all([
      this.prisma.salesOrderHeader.findMany({
        where,
        orderBy: { orderDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          soNumber: true,
          orderDate: true,
          status: true,
          totalValue: true,
          customer: { select: { customerName: true } },
        },
      }),
      this.prisma.salesOrderHeader.count({ where }),
      this.prisma.salesOrderHeader.aggregate({
        _sum: { totalValue: true },
        _count: { _all: true },
        where,
      }),
      this.prisma.salesOrderHeader.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);

    const statusCounts = statusGroups.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    return {
      kpis: {
        totalCount: totals._count._all,
        totalValue: Number(totals._sum.totalValue ?? 0),
        confirmedCount: statusCounts[SalesOrderStatus.CONFIRMED] ?? 0,
        fulfilledCount: statusCounts[SalesOrderStatus.FULFILLED] ?? 0,
        cancelledCount: statusCounts[SalesOrderStatus.CANCELLED] ?? 0,
      },
      rows: rows.map((row) => ({
        id: row.id,
        orderNumber: row.soNumber,
        orderDate: row.orderDate.toISOString(),
        customer: row.customer?.customerName ?? '',
        status: row.status,
        totalValue: Number(row.totalValue ?? 0),
      })),
      pagination: { page, limit, totalCount },
    };
  }

  async listSavedFilters(user: RequestUser, reportType?: string) {
    await this.assertReportsAllowed(user);
    const userId = user.id;
    return this.prisma.reportSavedFilter.findMany({
      where: {
        userId,
        ...(reportType ? { reportType } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSavedFilter(
    user: RequestUser,
    payload: { reportType: string; name: string; filterJson: Prisma.InputJsonValue },
  ) {
    await this.assertReportsAllowed(user);
    return this.prisma.reportSavedFilter.create({
      data: {
        userId: user.id,
        reportType: payload.reportType,
        name: payload.name,
        filterJson: payload.filterJson,
      },
    });
  }

  async deleteSavedFilter(user: RequestUser, id: string) {
    await this.assertReportsAllowed(user);
    return this.prisma.reportSavedFilter.deleteMany({
      where: { id, userId: user.id },
    });
  }

  private async sumStockValue(shopIds: string[]) {
    const stockExpr = effectiveCurrentStockExpr('ss');
    const rows = await this.prisma.$queryRaw<Array<{ total_value: string | null }>>(
      Prisma.sql`
        SELECT COALESCE(SUM((${stockExpr}) * p.purchase_price), 0)::text AS total_value
        FROM product_plants pp
        JOIN products p ON p.id = pp.product_id AND p.is_active = true
        LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
        WHERE pp.is_active = true AND pp.shop_id = ANY(${shopIds}::uuid[])
      `,
    );
    const row = rows[0] ?? { total_value: '0' };
    return Number(row.total_value ?? 0);
  }

  private async countLowStock(shopIds: string[]) {
    const stockExpr = effectiveCurrentStockExpr('ss');
    const rows = await this.prisma.$queryRaw<Array<{ low_count: string | null }>>(
      Prisma.sql`
        SELECT COALESCE(SUM(CASE
          WHEN pp.min_stock_level > 0 AND (${stockExpr}) <= pp.min_stock_level
          THEN 1 ELSE 0 END), 0)::text AS low_count
        FROM product_plants pp
        LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
        WHERE pp.is_active = true AND pp.shop_id = ANY(${shopIds}::uuid[])
      `,
    );
    const row = rows[0] ?? { low_count: '0' };
    return Number(row.low_count ?? 0);
  }

  private computeChangePct(current: number, prior: number) {
    if (!prior) return null;
    return Math.round(((current - prior) / prior) * 1000) / 10;
  }

  private async periodSalesMetrics(shopIds: string[], from: Date, to: Date) {
    const [salesAgg, poAgg, grAgg, soCount] = await Promise.all([
      this.prisma.salesOrderHeader.aggregate({
        _sum: { totalValue: true },
        where: {
          shopId: { in: shopIds },
          orderDate: { gte: from, lte: to },
          status: { not: SalesOrderStatus.CANCELLED },
        },
      }),
      this.prisma.purchaseOrderHeader.aggregate({
        _sum: { totalValue: true },
        where: {
          shopId: { in: shopIds },
          poDate: { gte: from, lte: to },
          status: { not: PurchaseOrderStatus.CANCELLED },
        },
      }),
      this.prisma.goodsReceiptHeader.aggregate({
        _sum: { totalValue: true },
        where: {
          shopId: { in: shopIds },
          grDate: { gte: from, lte: to },
          status: DocumentStatus.POSTED,
        },
      }),
      this.prisma.salesOrderHeader.count({
        where: { shopId: { in: shopIds }, orderDate: { gte: from, lte: to } },
      }),
    ]);
    return {
      revenue: Number(salesAgg._sum.totalValue ?? 0),
      poValue: Number(poAgg._sum.totalValue ?? 0),
      grValue: Number(grAgg._sum.totalValue ?? 0),
      salesOrders: soCount,
    };
  }

  private async openPoValue(shopIds: string[], from: Date, to: Date) {
    const rows = await this.prisma.$queryRaw<Array<{ open_value: string | null }>>(
      Prisma.sql`
        SELECT COALESCE(SUM(GREATEST(
          COALESCE(po.total_value, 0)
          - COALESCE(gr.total_received, 0), 0
        )), 0)::text AS open_value
        FROM purchase_order_header po
        LEFT JOIN (
          SELECT purchase_order_id, COALESCE(SUM(total_value), 0) as total_received
          FROM goods_receipt_header
          WHERE status = 'POSTED'
          GROUP BY purchase_order_id
        ) gr ON gr.purchase_order_id = po.id
        WHERE po.shop_id = ANY(${shopIds}::uuid[])
          AND po.status = 'CONFIRMED'
          AND po.po_date BETWEEN ${from} AND ${to}
      `,
    );
    const row = rows[0] ?? { open_value: '0' };
    return Number(row.open_value ?? 0);
  }

  async executiveSummary(
    user: RequestUser,
    filters: { shop_id?: string; date_from?: string; date_to?: string },
  ) {
    await this.assertReportsAllowed(user);
    const shopIds = await this.resolveShopIds(user, filters.shop_id);
    const { from, to } = this.resolveDateRange(filters.date_from, filters.date_to);
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
    const priorFrom = new Date(from);
    priorFrom.setDate(priorFrom.getDate() - days);
    const priorTo = new Date(to);
    priorTo.setDate(priorTo.getDate() - days);

    const [stockValue, lowStockCount, currentMetrics, priorMetrics, openPo, openPoPrior] =
      await Promise.all([
        this.sumStockValue(shopIds),
        this.countLowStock(shopIds),
        this.periodSalesMetrics(shopIds, from, to),
        this.periodSalesMetrics(shopIds, priorFrom, priorTo),
        this.openPoValue(shopIds, from, to),
        this.openPoValue(shopIds, priorFrom, priorTo),
      ]);

    const kpis = [
      {
        key: 'revenue',
        label: 'Revenue',
        value: currentMetrics.revenue,
        priorValue: priorMetrics.revenue,
        changePct: this.computeChangePct(currentMetrics.revenue, priorMetrics.revenue),
      },
      {
        key: 'inventory_value',
        label: 'Inventory Value',
        value: stockValue,
        priorValue: stockValue,
        changePct: null,
      },
      {
        key: 'po_value',
        label: 'PO Value (period)',
        value: currentMetrics.poValue,
        priorValue: priorMetrics.poValue,
        changePct: this.computeChangePct(currentMetrics.poValue, priorMetrics.poValue),
      },
      {
        key: 'open_po_value',
        label: 'Open PO Value',
        value: openPo,
        priorValue: openPoPrior,
        changePct: this.computeChangePct(openPo, openPoPrior),
      },
      {
        key: 'low_stock',
        label: 'Low Stock',
        value: lowStockCount,
        priorValue: lowStockCount,
        changePct: null,
      },
      {
        key: 'sales_orders',
        label: 'Sales Orders',
        value: currentMetrics.salesOrders,
        priorValue: priorMetrics.salesOrders,
        changePct: this.computeChangePct(currentMetrics.salesOrders, priorMetrics.salesOrders),
      },
      {
        key: 'gr_value',
        label: 'GR Value',
        value: currentMetrics.grValue,
        priorValue: priorMetrics.grValue,
        changePct: this.computeChangePct(currentMetrics.grValue, priorMetrics.grValue),
      },
    ];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const alertGroups = await this.prisma.alertEvent.groupBy({
      by: ['alertType'],
      _count: { _all: true },
      where: {
        shopId: { in: shopIds },
        triggeredAt: { gte: sevenDaysAgo },
      },
    });

    const alerts = alertGroups.map((row) => ({
      severity: 'warning',
      label: row.alertType.replace(/_/g, ' ').toLowerCase(),
      count: row._count._all,
      drillTab: row.alertType === 'LOW_STOCK' ? 'low-stock' : 'purchase-orders',
      drillFilters: {},
    }));

    const negativeStockCount = await this.prisma.stockSummary.count({
      where: { shopId: { in: shopIds }, currentStock: { lt: 0 } },
    });

    const pendingOutbox = await this.prisma.documentEmailOutbox.count({
      where: {
        status: { in: [DocumentEmailStatus.PENDING_PDF, DocumentEmailStatus.PENDING_SEND] },
      },
    });

    const failedEmails = await this.prisma.documentEmailOutbox.count({
      where: {
        status: DocumentEmailStatus.FAILED,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    const staleDraftCutoff = new Date();
    staleDraftCutoff.setDate(staleDraftCutoff.getDate() - 30);

    const staleDrafts = await this.prisma.purchaseOrderHeader.count({
      where: { status: PurchaseOrderStatus.DRAFT, createdAt: { lt: staleDraftCutoff } },
    });

    const systemHealth = {
      negativeStockCount,
      failedEmailCount: failedEmails,
      pendingOutboxCount: pendingOutbox,
      staleDraftCount: staleDrafts,
    };

    const topSuppliers = await this.prisma.purchaseOrderHeader.groupBy({
      by: ['supplier'],
      _sum: { totalValue: true },
      where: { shopId: { in: shopIds }, poDate: { gte: from, lte: to } },
      orderBy: { _sum: { totalValue: 'desc' } },
      take: 5,
    });

    const topCustomers = await this.prisma.salesOrderHeader.groupBy({
      by: ['customerId'],
      _sum: { totalValue: true },
      where: { shopId: { in: shopIds }, orderDate: { gte: from, lte: to } },
      orderBy: { _sum: { totalValue: 'desc' } },
      take: 5,
    });

    const customerNames = await this.prisma.customer.findMany({
      where: { id: { in: topCustomers.map((row) => row.customerId) } },
      select: { id: true, customerName: true },
    });

    const customerNameMap = new Map(customerNames.map((c) => [c.id, c.customerName]));

    const rankings = {
      topSuppliers: topSuppliers.map((row) => ({
        label: row.supplier,
        value: Number(row._sum.totalValue ?? 0),
      })),
      topCustomers: topCustomers.map((row) => ({
        label: customerNameMap.get(row.customerId) ?? 'Unknown',
        value: Number(row._sum.totalValue ?? 0),
      })),
    };

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      kpis,
      alerts,
      rankings,
      systemHealth,
    };
  }

  async inventoryAging(
    user: RequestUser,
    filters: { shop_id?: string; bucket?: string },
  ) {
    await this.assertReportsAllowed(user);
    const shopIds = await this.resolveShopIds(user, filters.shop_id);
    const shopArray = Prisma.sql`ARRAY[${Prisma.join(
      shopIds.map((id) => Prisma.sql`${id}::uuid`),
    )}]::uuid[]`;

    const bucketRows = await this.prisma.$queryRaw<
      Array<{ bucket: string; item_count: string; total_value: string }>
    >(Prisma.sql`
      WITH base AS (
        SELECT
          pp.shop_id,
          p.id,
          p.product_code,
          p.description,
          ss.current_stock,
          COALESCE(ss.last_movement_at, pp.created_at) AS last_movement_at,
          COALESCE(NULLIF(ss.avg_cost, 0), NULLIF(p.purchase_price, 0), 0) AS unit_cost
        FROM product_plants pp
        JOIN products p ON p.id = pp.product_id AND p.is_active = true
        LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
        WHERE pp.is_active = true AND pp.shop_id = ANY(${shopArray})
      ),
      aged AS (
        SELECT *,
          DATE_PART('day', NOW() - last_movement_at) AS age_days
        FROM base
        WHERE COALESCE(current_stock, 0) > 0
      )
      SELECT
        CASE
          WHEN age_days <= 30 THEN '0-30'
          WHEN age_days <= 60 THEN '31-60'
          WHEN age_days <= 90 THEN '61-90'
          ELSE '90+'
        END AS bucket,
        COUNT(*)::text AS item_count,
        COALESCE(SUM(current_stock * unit_cost), 0)::text AS total_value
      FROM aged
      GROUP BY bucket
      ORDER BY bucket ASC
    `);

    const buckets = ['0-30', '31-60', '61-90', '90+'].map((bucket) => {
      const row = bucketRows.find((r) => r.bucket === bucket);
      return {
        bucket,
        itemCount: Number(row?.item_count ?? 0),
        totalValue: Number(row?.total_value ?? 0),
      };
    });

    let rows: Array<{
      productCode: string;
      description: string;
      shopId: string;
      currentStock: number;
      lastMovementAt: string | null;
      ageDays: number;
      stockValue: number;
    }> = [];

    if (filters.bucket) {
      rows = await this.prisma.$queryRaw(
        Prisma.sql`
          WITH base AS (
            SELECT
              pp.shop_id,
              p.product_code,
              p.description,
              ss.current_stock,
              COALESCE(ss.last_movement_at, pp.created_at) AS last_movement_at,
              COALESCE(NULLIF(ss.avg_cost, 0), NULLIF(p.purchase_price, 0), 0) AS unit_cost,
              DATE_PART('day', NOW() - COALESCE(ss.last_movement_at, pp.created_at)) AS age_days
            FROM product_plants pp
            JOIN products p ON p.id = pp.product_id AND p.is_active = true
            LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
            WHERE pp.is_active = true AND pp.shop_id = ANY(${shopArray})
          )
          SELECT
            product_code,
            description,
            shop_id,
            COALESCE(current_stock, 0)::text AS current_stock,
            last_movement_at,
            age_days::int as age_days,
            (COALESCE(current_stock, 0) * unit_cost)::text AS stock_value
          FROM base
          WHERE COALESCE(current_stock, 0) > 0
            AND CASE
              WHEN age_days <= 30 THEN '0-30'
              WHEN age_days <= 60 THEN '31-60'
              WHEN age_days <= 90 THEN '61-90'
              ELSE '90+'
            END = ${filters.bucket}
          ORDER BY age_days DESC
          LIMIT 200
        `,
      );
    }

    return {
      buckets,
      rows: rows.map((row: any) => ({
        productCode: String(row.product_code ?? ''),
        description: String(row.description ?? ''),
        shopId: String(row.shop_id ?? ''),
        currentStock: Number(row.current_stock ?? 0),
        lastMovementAt: row.last_movement_at ? new Date(row.last_movement_at).toISOString() : null,
        ageDays: Number(row.age_days ?? 0),
        stockValue: Number(row.stock_value ?? 0),
      })),
    };
  }

  async rfqSummary(
    user: RequestUser,
    filters: { shop_id?: string; date_from?: string; date_to?: string },
  ) {
    await this.assertReportsAllowed(user);
    const shopIds = await this.resolveShopIds(user, filters.shop_id);
    const { from, to } = this.resolveDateRange(filters.date_from, filters.date_to);

    const [createdCount, postedCount, awardedRows, cycleRows] = await Promise.all([
      this.prisma.rfqHeader.count({
        where: { shopId: { in: shopIds }, rfqDate: { gte: from, lte: to } },
      }),
      this.prisma.rfqHeader.count({
        where: {
          shopId: { in: shopIds },
          rfqDate: { gte: from, lte: to },
          status: DocumentStatus.POSTED,
        },
      }),
      this.prisma.$queryRaw<Array<{ awarded_count: string | null }>>(
        Prisma.sql`
          SELECT COUNT(DISTINCT po.rfq_id)::text AS awarded_count
          FROM purchase_order_header po
          WHERE po.rfq_id IS NOT NULL
            AND po.shop_id = ANY(${shopIds}::uuid[])
            AND po.po_date BETWEEN ${from} AND ${to}
        `,
      ),
      this.prisma.$queryRaw<Array<{ avg_days: string | null }>>(
        Prisma.sql`
          WITH rfq_po AS (
            SELECT r.id as rfq_id,
                   r.rfq_date,
                   MIN(po.po_date) as po_date
            FROM rfq_header r
            JOIN purchase_order_header po ON po.rfq_id = r.id
            WHERE r.shop_id = ANY(${shopIds}::uuid[])
              AND r.rfq_date BETWEEN ${from} AND ${to}
            GROUP BY r.id, r.rfq_date
          )
          SELECT COALESCE(AVG((po_date - rfq_date)), 0)::text AS avg_days
          FROM rfq_po
        `,
      ),
    ]);

    const awardedCount = Number(awardedRows[0]?.awarded_count ?? 0);
    const avgDays = Number(cycleRows[0]?.avg_days ?? 0);
    const conversionPct = postedCount > 0 ? Math.round((awardedCount / postedCount) * 1000) / 10 : 0;

    return {
      createdCount,
      postedCount,
      awardedCount,
      conversionPct,
      avgCycleDays: avgDays,
    };
  }

  async fastMoving(
    user: RequestUser,
    filters: { shop_id: string; date_from: string; date_to: string; limit?: number },
  ) {
    await this.assertReportsAllowed(user);
    assertShopScope(user, filters.shop_id);
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 200);
    return this.prisma.$queryRaw<
      {
        product_code: string;
        description: string;
        total_issued_qty: Prisma.Decimal;
        velocity: Prisma.Decimal;
        is_top_velocity_decile: boolean;
      }[]
    >(Prisma.sql`
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
      JOIN product_plants pp ON pp.product_id = r.product_id
                            AND pp.shop_id = (SELECT shop_id FROM bounds)
      JOIN products p ON p.id = pp.product_id
      ORDER BY r.total_issued_qty DESC
      LIMIT ${limit}
    `);
  }

  async damagedRegister(user: RequestUser, shop_id?: string) {
    await this.assertReportsAllowed(user);
    const shopWhere = this.shopWhere(user, shop_id);
    return this.prisma.damagedStock.findMany({
      where: { shop: shopWhere, ...(shop_id ? { shopId: shop_id } : {}) },
      orderBy: { damageDate: 'desc' },
      include: { product: true, shop: true },
    });
  }

  async grRegister(
    user: RequestUser,
    filters: {
      date_from?: string;
      date_to?: string;
      shop_id?: string;
      gr_number?: string;
      status?: string;
      product_id?: string;
      category?: string;
    },
  ) {
    await this.assertReportsAllowed(user);
    const shopWhere = this.shopWhere(user, filters.shop_id);
    const { from, to } = this.resolveDateRange(filters.date_from, filters.date_to);
    const statusFilter = Object.values(DocumentStatus).includes(filters.status as DocumentStatus)
      ? (filters.status as DocumentStatus)
      : undefined;
    return this.prisma.goodsReceiptHeader.findMany({
      where: {
        grDate: { gte: from, lte: to },
        shop: shopWhere,
        ...(filters.shop_id ? { shopId: filters.shop_id } : {}),
        ...(filters.gr_number
          ? { grNumber: { contains: filters.gr_number, mode: 'insensitive' } }
          : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(filters.product_id || filters.category
          ? {
              items: {
                some: {
                  ...(filters.product_id ? { productId: filters.product_id } : {}),
                  ...(filters.category
                    ? { product: { category: filters.category } }
                    : {}),
                },
              },
            }
          : {}),
      },
      orderBy: { grDate: 'desc' },
      include: { shop: true, items: true },
    });
  }

  async giRegister(user: RequestUser, date_from?: string, date_to?: string, shop_id?: string) {
    await this.assertReportsAllowed(user);
    const shopWhere = this.shopWhere(user, shop_id);
    const { from, to } = this.resolveDateRange(date_from, date_to);
    return this.prisma.goodsIssueHeader.findMany({
      where: {
        giDate: { gte: from, lte: to },
        shop: shopWhere,
        ...(shop_id ? { shopId: shop_id } : {}),
      },
      orderBy: { giDate: 'desc' },
      include: { shop: true, items: true },
    });
  }

  async stockLedger(user: RequestUser, product_id?: string, date_from?: string, date_to?: string, shop_id?: string) {
    await this.assertReportsAllowed(user);
    const { from, to } = this.resolveDateRange(date_from, date_to);
    const shopWhere = this.shopWhere(user, shop_id);
    const scopedShopId = shop_id;
    let validatedProductShopId: string | undefined;

    if (product_id) {
      const product = await this.prisma.product.findUnique({
        where: { id: product_id },
        include: { plants: { select: { shopId: true } } },
      });
      if (!product) return [];
      // The product is master data now; "shop scope" means the user must be
      // assigned to at least one of the product's plants. If they passed a
      // shop_id, assert it explicitly; otherwise default to their own shop
      // when they have one.
      if (scopedShopId) {
        const assigned = product.plants.some((pp) => pp.shopId === scopedShopId);
        if (!assigned) return [];
        validatedProductShopId = scopedShopId;
      } else if (user.shopId) {
        const assigned = product.plants.some((pp) => pp.shopId === user.shopId);
        if (!assigned) return [];
        validatedProductShopId = user.shopId;
      }
    }

    const rows = await this.prisma.stockLedger.findMany({
      where: {
        shop: shopWhere,
        ...(product_id ? { productId: product_id } : {}),
        ...((validatedProductShopId ?? scopedShopId) ? { shopId: validatedProductShopId ?? scopedShopId } : {}),
        transactionDate: { gte: from, lte: to },
      },
      orderBy: { transactionDate: 'asc' },
      include: {
        product: { select: { productCode: true, description: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      transaction_date: row.transactionDate,
      transaction_type: row.transactionType,
      product_code: row.product.productCode,
      description: row.product.description,
      in_qty: row.inQty,
      out_qty: row.outQty,
      balance_qty: row.balanceQty,
      reference_number: row.transactionRef,
    }));
  }

  async shopSummary(user: RequestUser, filters: { shop_id?: string; date_from?: string; date_to?: string }) {
    await this.assertReportsAllowed(user);
    const shopIds = await this.resolveShopIds(user, filters.shop_id);
    const { from, to } = this.resolveDateRange(filters.date_from, filters.date_to);
    const shopArray = Prisma.sql`ARRAY[${Prisma.join(
      shopIds.map((id) => Prisma.sql`${id}::uuid`),
    )}]::uuid[]`;
    const rows = await this.prisma.$queryRaw<
      {
        shop_id: string;
        shop_name: string;
        sku_count: number;
        stock_value: Prisma.Decimal | null;
        low_stock_count: number | null;
        total_gr: number | null;
        total_gi: number | null;
        sales_value: Prisma.Decimal | null;
      }[]
    >(Prisma.sql`
      SELECT sh.id as shop_id,
             sh.shop_name,
             COUNT(DISTINCT p.id)::int as sku_count,
             SUM((${effectiveCurrentStockExpr('ss')}) * p.purchase_price) as stock_value,
             SUM(CASE
               WHEN pp.min_stock_level > 0 AND (${effectiveCurrentStockExpr('ss')}) <= pp.min_stock_level
               THEN 1 ELSE 0 END)::int as low_stock_count,
             COALESCE((
               SELECT COUNT(*) FROM goods_receipt_header gr
               WHERE gr.shop_id = sh.id
                 AND gr.status = 'POSTED'
                 AND gr.gr_date BETWEEN ${from} AND ${to}
             ), 0)::int as total_gr,
             COALESCE((
               SELECT COUNT(*) FROM goods_issue_header gi
               WHERE gi.shop_id = sh.id
                 AND gi.status = 'POSTED'
                 AND gi.gi_date BETWEEN ${from} AND ${to}
             ), 0)::int as total_gi,
             COALESCE((
               SELECT SUM(so.total_value) FROM sales_order_header so
               WHERE so.shop_id = sh.id
                 AND so.status != 'CANCELLED'
                 AND so.order_date BETWEEN ${from} AND ${to}
             ), 0) as sales_value
      FROM shops sh
      LEFT JOIN product_plants pp ON pp.shop_id = sh.id AND pp.is_active = true
      LEFT JOIN products p ON p.id = pp.product_id AND p.is_active = true
      LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
      WHERE sh.id = ANY(${shopArray})
      GROUP BY sh.id, sh.shop_name
      ORDER BY sh.shop_name ASC
    `);
    return rows.map((r) => ({
      shop_id: r.shop_id,
      shop_name: r.shop_name,
      sku_count: Number(r.sku_count ?? 0),
      stock_value: Number(r.stock_value ?? 0),
      low_stock_count: Number(r.low_stock_count ?? 0),
      total_gr: Number(r.total_gr ?? 0),
      total_gi: Number(r.total_gi ?? 0),
      sales_value: Number(r.sales_value ?? 0),
    }));
  }
}
