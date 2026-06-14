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

    const stockQty = Prisma.raw(`(${effectiveCurrentStockExpr('ss')})`);
    const unitCost = Prisma.raw(
      'COALESCE(NULLIF(ss.avg_cost, 0), NULLIF(p.purchase_price, 0), 0)',
    );
    const [stockRows, poAgg, salesAgg, grCount, soCount] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{ stock_value: string | null; low_stock_count: string | null }>
      >(Prisma.sql`
        SELECT
          COALESCE(SUM(${stockQty} * ${unitCost}), 0)::text AS stock_value,
          COALESCE(SUM(CASE
            WHEN pp.min_stock_level > 0 AND ${stockQty} <= pp.min_stock_level
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
    const shopArray = Prisma.sql`ARRAY[${Prisma.join(
      shopIds.map((id) => Prisma.sql`${id}::uuid`),
    )}]::uuid[]`;
    const stockQty = Prisma.raw(`(${effectiveCurrentStockExpr('ss')})`);
    const unitCost = Prisma.raw(
      'COALESCE(NULLIF(ss.avg_cost, 0), NULLIF(p.purchase_price, 0), 0)',
    );
    const rows = await this.prisma.$queryRaw<Array<{ total_value: string | null }>>(
      Prisma.sql`
        SELECT COALESCE(SUM(${stockQty} * ${unitCost}), 0)::text AS total_value
        FROM product_plants pp
        JOIN products p ON p.id = pp.product_id AND p.is_active = true
        LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
        WHERE pp.is_active = true AND pp.shop_id = ANY(${shopArray})
      `,
    );
    const row = rows[0] ?? { total_value: '0' };
    return Number(row.total_value ?? 0);
  }

  private async countLowStock(shopIds: string[]) {
    const shopArray = Prisma.sql`ARRAY[${Prisma.join(
      shopIds.map((id) => Prisma.sql`${id}::uuid`),
    )}]::uuid[]`;
    const stockQty = Prisma.raw(`(${effectiveCurrentStockExpr('ss')})`);
    const rows = await this.prisma.$queryRaw<Array<{ low_count: string | null }>>(
      Prisma.sql`
        SELECT COALESCE(SUM(CASE
          WHEN pp.min_stock_level > 0 AND ${stockQty} <= pp.min_stock_level
          THEN 1 ELSE 0 END), 0)::text AS low_count
        FROM product_plants pp
        LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
        WHERE pp.is_active = true AND pp.shop_id = ANY(${shopArray})
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
    const shopArray = Prisma.sql`ARRAY[${Prisma.join(
      shopIds.map((id) => Prisma.sql`${id}::uuid`),
    )}]::uuid[]`;
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
        WHERE po.shop_id = ANY(${shopArray})
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
    const stockQty = Prisma.raw(`(${effectiveCurrentStockExpr('ss')})`);
    const lastMovementAt = Prisma.raw(`
COALESCE(
  ss.last_movement_at,
  (
    SELECT MAX(sl.transaction_date::timestamptz)
    FROM stock_ledger sl
    WHERE sl.shop_id = pp.shop_id AND sl.product_id = pp.product_id
  ),
  pp.created_at
)`);
    const unitCost = Prisma.raw(
      'COALESCE(NULLIF(ss.avg_cost, 0), NULLIF(p.purchase_price, 0), 0)',
    );

    const bucketRows = await this.prisma.$queryRaw<
      Array<{ bucket: string; item_count: string; total_value: string }>
    >(Prisma.sql`
      WITH base AS (
        SELECT
          pp.shop_id,
          p.id,
          p.product_code,
          p.description,
          ${stockQty} AS current_stock,
          ${lastMovementAt} AS last_movement_at,
          ${unitCost} AS unit_cost
        FROM product_plants pp
        JOIN products p ON p.id = pp.product_id AND p.is_active = true
        LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
        WHERE pp.is_active = true AND pp.shop_id = ANY(${shopArray})
      ),
      aged AS (
        SELECT *,
          DATE_PART('day', NOW() - last_movement_at) AS age_days
        FROM base
        WHERE current_stock > 0
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
              ${stockQty} AS current_stock,
              ${lastMovementAt} AS last_movement_at,
              ${unitCost} AS unit_cost,
              DATE_PART('day', NOW() - (${lastMovementAt})) AS age_days
            FROM product_plants pp
            JOIN products p ON p.id = pp.product_id AND p.is_active = true
            LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
            WHERE pp.is_active = true AND pp.shop_id = ANY(${shopArray})
          )
          SELECT
            product_code,
            description,
            shop_id,
            current_stock::text AS current_stock,
            last_movement_at,
            age_days::int as age_days,
            (current_stock * unit_cost)::text AS stock_value
          FROM base
          WHERE current_stock > 0
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
    const stockQty = Prisma.raw(`(${effectiveCurrentStockExpr('ss')})`);
    const unitCost = Prisma.raw(
      'COALESCE(NULLIF(ss.avg_cost, 0), NULLIF(p.purchase_price, 0), 0)',
    );
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
             SUM(${stockQty} * ${unitCost}) as stock_value,
             SUM(CASE
               WHEN pp.min_stock_level > 0 AND ${stockQty} <= pp.min_stock_level
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

  async deadStock(
    user: RequestUser,
    filters: {
      shop_id?: string;
      category?: string;
      supplier?: string;
      days_unsold: number;
      sort_by?: 'stockValue' | 'daysUnsold';
      page?: number;
      limit?: number;
    },
  ) {
    await this.assertReportsAllowed(user);
    const shopIds = await this.resolveShopIds(user, filters.shop_id);
    const shopArray = Prisma.sql`ARRAY[${Prisma.join(
      shopIds.map((id) => Prisma.sql`${id}::uuid`),
    )}]::uuid[]`;

    const sortBy = filters.sort_by ?? 'stockValue';
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);

    const whereClause = Prisma.sql`
      p.is_active = true
      AND pp.is_active = true
      AND pp.shop_id = ANY(${shopArray})
      AND EXTRACT(DAY FROM NOW() - COALESCE(sl.last_sale_date, p.created_at)) >= ${filters.days_unsold}
      ${filters.category ? Prisma.sql`AND p.category = ${filters.category}` : Prisma.empty}
      ${filters.supplier ? Prisma.sql`AND s.name ILIKE ${'%' + filters.supplier + '%'}` : Prisma.empty}
      AND COALESCE(ss.current_stock, 0) > 0
    `;

    const [totalRows, rows] = await Promise.all([
      this.prisma.$queryRaw<[{ count: BigInt }]>(Prisma.sql`
        SELECT COUNT(*)::bigint as count
        FROM products p
        JOIN product_plants pp ON pp.product_id = p.id
        LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = p.id
        LEFT JOIN (
          SELECT product_id, MAX(created_at) as last_sale_date
          FROM stock_ledger
          WHERE transaction_type = 'OUT'
          GROUP BY product_id
        ) sl ON sl.product_id = p.id
        LEFT JOIN suppliers s ON s.id = p.supplier_id
        WHERE ${whereClause}
      `),
      this.prisma.$queryRaw<
        Array<{
          product_id: string;
          product_code: string;
          description: string;
          category: string;
          supplier_name: string | null;
          current_stock: Prisma.Decimal;
          unit_cost: Prisma.Decimal;
          stock_value: Prisma.Decimal;
          last_sale_date: Date | null;
          days_unsold: number;
        }>
      >(Prisma.sql`
        SELECT
          p.id as product_id,
          p.product_code,
          p.description,
          p.category,
          s.name as supplier_name,
          COALESCE(ss.current_stock, 0)::numeric as current_stock,
          COALESCE(ss.avg_cost, p.purchase_price, 0)::numeric as unit_cost,
          (COALESCE(ss.current_stock, 0) * COALESCE(ss.avg_cost, p.purchase_price, 0))::numeric as stock_value,
          COALESCE(sl.last_sale_date, p.created_at) as last_sale_date,
          EXTRACT(DAY FROM NOW() - COALESCE(sl.last_sale_date, p.created_at))::int as days_unsold
        FROM products p
        JOIN product_plants pp ON pp.product_id = p.id
        LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = p.id
        LEFT JOIN (
          SELECT product_id, MAX(created_at) as last_sale_date
          FROM stock_ledger
          WHERE transaction_type = 'OUT'
          GROUP BY product_id
        ) sl ON sl.product_id = p.id
        LEFT JOIN suppliers s ON s.id = p.supplier_id
        WHERE ${whereClause}
        ORDER BY ${sortBy === 'daysUnsold' ? Prisma.sql`days_unsold DESC` : Prisma.sql`stock_value DESC`}
        OFFSET ${(page - 1) * limit}
        LIMIT ${limit}
      `),
    ]);

    const totalCount = Number(totalRows[0]?.count ?? 0);
    const totalDeadValue = rows.reduce((sum, r) => sum + Number(r.stock_value ?? 0), 0);

    return {
      summary: {
        totalDeadItems: totalCount,
        totalDeadQty: rows.reduce((sum, r) => sum + Number(r.current_stock ?? 0), 0),
        totalDeadValue,
        theme: totalDeadValue > 1000000 ? 'Critical' : totalDeadValue > 500000 ? 'High' : 'Medium',
      },
      items: rows.map((r) => ({
        productId: r.product_id,
        productCode: r.product_code,
        name: r.description,
        category: r.category,
        supplier: r.supplier_name ?? 'Unknown',
        currentStock: Number(r.current_stock ?? 0),
        unitCost: Number(r.unit_cost ?? 0),
        stockValue: Number(r.stock_value ?? 0),
        lastSaleDate: r.last_sale_date?.toISOString() ?? null,
        daysUnsold: r.days_unsold,
        severity:
          r.days_unsold >= 180
            ? 'CRITICAL'
            : r.days_unsold >= 120
              ? 'HIGH'
              : 'MEDIUM',
        recommendation:
          r.days_unsold >= 180
            ? 'STOP_REORDER'
            : r.days_unsold >= 120
              ? 'OFFER_DISCOUNT'
              : 'MONITOR',
      })),
      pagination: { page, limit, totalCount },
    };
  }

  async reorderIntelligence(
    user: RequestUser,
    filters: {
      shop_id: string;
      date_from?: string;
      date_to?: string;
      category?: string;
      stock_status?: 'IN_STOCK' | 'BELOW_MIN' | 'OVERSTOCK';
      sort_by?: 'urgency' | 'daysLeft' | 'avgSalesPerDay';
      page?: number;
      limit?: number;
    },
  ) {
    await this.assertReportsAllowed(user);
    assertShopScope(user, filters.shop_id);

    const now = new Date();
    const dateFrom = filters.date_from ? new Date(filters.date_from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = filters.date_to ? new Date(filters.date_to) : now;

    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    const sortBy = filters.sort_by ?? 'urgency';

    const [totalRows, rows] = await Promise.all([
      this.prisma.$queryRaw<[{ count: BigInt }]>(Prisma.sql`
        SELECT COUNT(*)::bigint as count
        FROM product_plants pp
        JOIN products p ON p.id = pp.product_id AND p.is_active = true
        LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
        WHERE pp.shop_id = ${filters.shop_id}
        AND pp.is_active = true
        ${filters.category ? Prisma.sql`AND p.category = ${filters.category}` : Prisma.empty}
      `),
      this.prisma.$queryRaw<
        Array<{
          product_id: string;
          product_code: string;
          description: string;
          category: string;
          current_stock: Prisma.Decimal;
          min_stock_level: Prisma.Decimal;
          avg_cost: Prisma.Decimal;
          sales_last_30: number;
          avg_sales_per_day: number;
          days_remaining: number;
          suggested_order_qty: number;
          lead_time_days: number;
          last_restock_date: Date | null;
        }>
      >(Prisma.sql`
        WITH sales_data AS (
          SELECT
            pp.product_id,
            COUNT(CASE WHEN sl.transaction_type = 'OUT' AND sl.created_at >= ${dateFrom} AND sl.created_at <= ${dateTo} THEN 1 END)::int as sales_qty
          FROM product_plants pp
          JOIN products p ON p.id = pp.product_id AND p.is_active = true
          LEFT JOIN stock_ledger sl ON sl.product_id = p.id AND sl.shop_id = pp.shop_id
          WHERE pp.shop_id = ${filters.shop_id}
          AND pp.is_active = true
          ${filters.category ? Prisma.sql`AND p.category = ${filters.category}` : Prisma.empty}
          GROUP BY pp.product_id
        )
        SELECT
          p.id as product_id,
          p.product_code,
          p.description,
          p.category,
          COALESCE(ss.current_stock, 0)::numeric as current_stock,
          COALESCE(pp.min_stock_level, 0)::numeric as min_stock_level,
          COALESCE(ss.avg_cost, p.purchase_price, 0)::numeric as avg_cost,
          COALESCE(sd.sales_qty, 0) as sales_last_30,
          CASE
            WHEN COALESCE(sd.sales_qty, 0) = 0 THEN 0
            ELSE COALESCE(sd.sales_qty, 0)::numeric / 30
          END::int as avg_sales_per_day,
          CASE
            WHEN COALESCE(sd.sales_qty, 0) = 0 THEN 999
            ELSE (COALESCE(ss.current_stock, 0) / (COALESCE(sd.sales_qty, 0)::numeric / 30))::int
          END as days_remaining,
          CASE
            WHEN COALESCE(sd.sales_qty, 0) = 0 THEN 0
            ELSE GREATEST(
              (COALESCE(sd.sales_qty, 0)::numeric / 30 * (7 + 30))::int - COALESCE(ss.current_stock, 0)::int,
              COALESCE(pp.min_stock_level, 0)::int - COALESCE(ss.current_stock, 0)::int
            )
          END as suggested_order_qty,
          COALESCE(p.lead_time_days, 7)::int as lead_time_days,
          (SELECT MAX(created_at) FROM stock_ledger WHERE product_id = p.id AND transaction_type = 'IN') as last_restock_date
        FROM product_plants pp
        JOIN products p ON p.id = pp.product_id AND p.is_active = true
        LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
        LEFT JOIN sales_data sd ON sd.product_id = p.id
        WHERE pp.shop_id = ${filters.shop_id}
        AND pp.is_active = true
        ${filters.category ? Prisma.sql`AND p.category = ${filters.category}` : Prisma.empty}
        ORDER BY ${
          sortBy === 'daysLeft'
            ? Prisma.sql`days_remaining ASC`
            : sortBy === 'avgSalesPerDay'
              ? Prisma.sql`avg_sales_per_day DESC`
              : Prisma.sql`
                  CASE
                    WHEN days_remaining < 7 THEN 1
                    WHEN days_remaining < 14 THEN 2
                    ELSE 3
                  END ASC,
                  days_remaining ASC
                `
        }
        OFFSET ${(page - 1) * limit}
        LIMIT ${limit}
      `),
    ]);

    const totalCount = Number(totalRows[0]?.count ?? 0);

    const summary = {
      totalProducts: totalCount,
      urgent: { count: 0, totalOrderQty: 0 },
      warning: { count: 0, totalOrderQty: 0 },
      normal: { count: 0, totalOrderQty: 0 },
    };

    return {
      summary: {
        ...summary,
        // Will be calculated from items
      },
      items: rows.map((r) => {
        const avgSalesPerDay = r.avg_sales_per_day;
        const daysRemaining = r.days_remaining;
        const suggestedOrderQty = Math.max(r.suggested_order_qty, 0);

        let urgency: 'HIGH' | 'MEDIUM' | 'LOW';
        let riskScore: number;

        if (daysRemaining < 7) {
          urgency = 'HIGH';
          riskScore = 90 + (7 - daysRemaining) * 5;
        } else if (daysRemaining < 14) {
          urgency = 'MEDIUM';
          riskScore = 60;
        } else {
          urgency = 'LOW';
          riskScore = 20;
        }

        return {
          productId: r.product_id,
          productCode: r.product_code,
          name: r.description,
          category: r.category,
          currentStock: Number(r.current_stock ?? 0),
          minStockLevel: Number(r.min_stock_level ?? 0),
          avgSalesPerDay,
          salesLast30Days: r.sales_last_30,
          daysRemaining,
          suggestedOrderQty,
          leadTimeDays: r.lead_time_days,
          lastRestockDate: r.last_restock_date?.toISOString() ?? null,
          urgency,
          riskScore,
          calculation: {
            salesLast30Days: r.sales_last_30,
            avgSalesPerDay: Number(avgSalesPerDay),
            currentStock: Number(r.current_stock ?? 0),
            daysRemaining: Number(daysRemaining),
            leadTimeDays: r.lead_time_days,
            safetyStockDays: 3,
            targetSupplyDays: 30,
            suggestedOrderQty: Number(suggestedOrderQty),
            reasoning: `Lead time (${r.lead_time_days}) + safety (3) + target (30) = ${r.lead_time_days + 33} days × ${avgSalesPerDay} = ${((r.lead_time_days + 33) * avgSalesPerDay).toFixed(0)} qty. Minus current (${Number(r.current_stock ?? 0)}) = ${suggestedOrderQty}`,
          },
        };
      }),
      pagination: { page, limit, totalCount },
    };
  }

  async customerAging(
    user: RequestUser,
    filters: {
      shop_id?: string;
      show_overdue_only?: boolean;
      customer_name?: string;
      sort_by?: 'totalOutstanding' | 'overdueAmount' | 'riskScore';
      page?: number;
      limit?: number;
    },
  ) {
    await this.assertReportsAllowed(user);
    const shopIds = await this.resolveShopIds(user, filters.shop_id);
    const shopArray = Prisma.sql`ARRAY[${Prisma.join(
      shopIds.map((id) => Prisma.sql`${id}::uuid`),
    )}]::uuid[]`;

    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    const sortBy = filters.sort_by ?? 'totalOutstanding';

    const [totalRows, rows, summaryRows] = await Promise.all([
      this.prisma.$queryRaw<[{ count: BigInt }]>(Prisma.sql`
        SELECT COUNT(DISTINCT c.id)::bigint as count
        FROM customers c
        LEFT JOIN sales_order_headers soh ON soh.customer_id = c.id AND soh.status IN ('CONFIRMED', 'FULFILLED')
        WHERE c.is_active = true
        AND soh.shop_id = ANY(${shopArray})
        ${filters.customer_name ? Prisma.sql`AND c.customer_name ILIKE ${'%' + filters.customer_name + '%'}` : Prisma.empty}
        GROUP BY c.id
        HAVING SUM(COALESCE(soh.outstanding_amount, 0)) > 0
      `),
      this.prisma.$queryRaw<
        Array<{
          customer_id: string;
          customer_name: string;
          last_transaction_date: Date | null;
          current_0_30: Prisma.Decimal;
          watch_31_60: Prisma.Decimal;
          high_risk_61_90: Prisma.Decimal;
          critical_90plus: Prisma.Decimal;
          total_outstanding: Prisma.Decimal;
          overdue_amount: Prisma.Decimal;
          overdue_invoice_count: number;
          avg_payment_days: number;
        }>
      >(Prisma.sql`
        WITH customer_invoices AS (
          SELECT
            c.id as customer_id,
            c.customer_name,
            MAX(soh.order_date) as last_transaction_date,
            SUM(CASE
              WHEN EXTRACT(DAY FROM NOW() - soh.order_date) <= 30
              THEN COALESCE(soh.outstanding_amount, 0)
              ELSE 0
            END) as current_0_30,
            SUM(CASE
              WHEN EXTRACT(DAY FROM NOW() - soh.order_date) BETWEEN 31 AND 60
              THEN COALESCE(soh.outstanding_amount, 0)
              ELSE 0
            END) as watch_31_60,
            SUM(CASE
              WHEN EXTRACT(DAY FROM NOW() - soh.order_date) BETWEEN 61 AND 90
              THEN COALESCE(soh.outstanding_amount, 0)
              ELSE 0
            END) as high_risk_61_90,
            SUM(CASE
              WHEN EXTRACT(DAY FROM NOW() - soh.order_date) > 90
              THEN COALESCE(soh.outstanding_amount, 0)
              ELSE 0
            END) as critical_90plus,
            SUM(COALESCE(soh.outstanding_amount, 0)) as total_outstanding,
            SUM(CASE
              WHEN EXTRACT(DAY FROM NOW() - soh.order_date) > 30
              THEN COALESCE(soh.outstanding_amount, 0)
              ELSE 0
            END) as overdue_amount,
            COUNT(CASE
              WHEN EXTRACT(DAY FROM NOW() - soh.order_date) > 30
              THEN 1
            END)::int as overdue_invoice_count,
            COALESCE(AVG(EXTRACT(DAY FROM NOW() - soh.order_date)), 0)::int as avg_payment_days
          FROM customers c
          LEFT JOIN sales_order_headers soh ON soh.customer_id = c.id AND soh.status IN ('CONFIRMED', 'FULFILLED') AND soh.shop_id = ANY(${shopArray})
          WHERE c.is_active = true
          ${filters.customer_name ? Prisma.sql`AND c.customer_name ILIKE ${'%' + filters.customer_name + '%'}` : Prisma.empty}
          GROUP BY c.id, c.customer_name
          HAVING SUM(COALESCE(soh.outstanding_amount, 0)) > 0
        )
        SELECT *
        FROM customer_invoices
        ${filters.show_overdue_only ? Prisma.sql`WHERE overdue_amount > 0` : Prisma.empty}
        ORDER BY ${
          sortBy === 'riskScore'
            ? Prisma.sql`(CASE WHEN overdue_amount::numeric / NULLIF(total_outstanding::numeric, 0) > 0.5 THEN 1 WHEN overdue_amount > 0 THEN 2 ELSE 3 END) ASC, overdue_amount DESC`
            : sortBy === 'overdueAmount'
              ? Prisma.sql`overdue_amount DESC`
              : Prisma.sql`total_outstanding DESC`
        }
        OFFSET ${(page - 1) * limit}
        LIMIT ${limit}
      `),
      this.prisma.$queryRaw<
        Array<{
          total_customers: number;
          total_outstanding: string;
          total_overdue: string;
          overdue_customers: number;
          avg_collection_days: number;
        }>
      >(Prisma.sql`
        WITH customer_invoices AS (
          SELECT
            c.id as customer_id,
            SUM(COALESCE(soh.outstanding_amount, 0)) as total_outstanding,
            SUM(CASE
              WHEN EXTRACT(DAY FROM NOW() - soh.order_date) > 30
              THEN COALESCE(soh.outstanding_amount, 0)
              ELSE 0
            END) as overdue_amount,
            COALESCE(AVG(EXTRACT(DAY FROM NOW() - soh.order_date)), 0)::int as avg_payment_days
          FROM customers c
          LEFT JOIN sales_order_headers soh ON soh.customer_id = c.id AND soh.status IN ('CONFIRMED', 'FULFILLED') AND soh.shop_id = ANY(${shopArray})
          WHERE c.is_active = true
          GROUP BY c.id
          HAVING SUM(COALESCE(soh.outstanding_amount, 0)) > 0
        )
        SELECT
          COUNT(*)::int as total_customers,
          SUM(total_outstanding)::text as total_outstanding,
          SUM(overdue_amount)::text as total_overdue,
          COUNT(CASE WHEN overdue_amount > 0 THEN 1 END)::int as overdue_customers,
          AVG(avg_payment_days)::int as avg_collection_days
        FROM customer_invoices
      `),
    ]);

    const totalCount = Number(totalRows[0]?.count ?? 0);
    const summary = summaryRows[0] ?? {
      total_customers: 0,
      total_outstanding: '0',
      total_overdue: '0',
      overdue_customers: 0,
      avg_collection_days: 0,
    };

    return {
      summary: {
        totalCustomers: summary.total_customers,
        totalOutstanding: Number(summary.total_outstanding ?? 0),
        totalOverdue: Number(summary.total_overdue ?? 0),
        overdueCustomers: summary.overdue_customers,
        avgCollectionDays: summary.avg_collection_days,
      },
      items: rows.map((r) => {
        const total = Number(r.total_outstanding ?? 0);
        const overdue = Number(r.overdue_amount ?? 0);
        const collectionRate = total > 0 ? ((total - overdue) / total) * 100 : 100;

        let riskScore: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'GREEN';
        if (overdue / total > 0.5 && total > 100000) {
          riskScore = 'CRITICAL';
        } else if (overdue > 0) {
          riskScore = 'HIGH';
        } else if (Number(r.avg_payment_days ?? 0) > 45) {
          riskScore = 'MEDIUM';
        } else {
          riskScore = 'GREEN';
        }

        const actions =
          riskScore === 'CRITICAL'
            ? ['Call customer immediately', 'Escalate to management', 'Consider stopping credit']
            : riskScore === 'HIGH'
              ? ['Send payment reminder', 'Schedule follow-up call', 'Review credit terms']
              : riskScore === 'MEDIUM'
                ? ['Send reminder email', 'Monitor next payment']
                : ['Continue normal terms'];

        return {
          customerId: r.customer_id,
          customerName: r.customer_name,
          lastTransactionDate: r.last_transaction_date?.toISOString() ?? null,
          agingBuckets: {
            current_0_30: Number(r.current_0_30 ?? 0),
            watch_31_60: Number(r.watch_31_60 ?? 0),
            highRisk_61_90: Number(r.high_risk_61_90 ?? 0),
            critical_90plus: Number(r.critical_90plus ?? 0),
          },
          totalOutstanding: total,
          overdueAmount: overdue,
          overdueInvoiceCount: r.overdue_invoice_count,
          collectionPercentage: Math.round(collectionRate * 10) / 10,
          avgPaymentDays: r.avg_payment_days,
          riskScore,
          actions,
        };
      }),
      pagination: { page, limit, totalCount },
    };
  }

  async productProfitability(
    user: RequestUser,
    filters: {
      shop_id?: string;
      date_from?: string;
      date_to?: string;
      category?: string;
      show_loss_only?: boolean;
      sort_by?: 'profit' | 'margin' | 'revenue';
      page?: number;
      limit?: number;
    },
  ) {
    await this.assertReportsAllowed(user);
    const shopIds = await this.resolveShopIds(user, filters.shop_id);
    const shopArray = Prisma.sql`ARRAY[${Prisma.join(
      shopIds.map((id) => Prisma.sql`${id}::uuid`),
    )}]::uuid[]`;

    const now = new Date();
    const dateFrom = filters.date_from ? new Date(filters.date_from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = filters.date_to ? new Date(filters.date_to) : now;

    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
    const sortBy = filters.sort_by ?? 'profit';

    const [totalRows, rows, summaryRows] = await Promise.all([
      this.prisma.$queryRaw<[{ count: BigInt }]>(Prisma.sql`
        SELECT COUNT(DISTINCT p.id)::bigint as count
        FROM products p
        LEFT JOIN sales_order_items soi ON soi.product_id = p.id
        LEFT JOIN sales_order_headers soh ON soh.id = soi.sales_order_id AND soh.order_date >= ${dateFrom} AND soh.order_date <= ${dateTo} AND soh.shop_id = ANY(${shopArray})
        WHERE p.is_active = true
        ${filters.category ? Prisma.sql`AND p.category = ${filters.category}` : Prisma.empty}
        GROUP BY p.id
        HAVING SUM(COALESCE(soi.quantity, 0)) > 0
      `),
      this.prisma.$queryRaw<
        Array<{
          product_id: string;
          product_code: string;
          description: string;
          category: string;
          units_sold: number;
          revenue: Prisma.Decimal;
          avg_cost_per_unit: Prisma.Decimal;
          cogs: Prisma.Decimal;
          profit: Prisma.Decimal;
          margin_percentage: number;
          avg_selling_price: Prisma.Decimal;
        }>
      >(Prisma.sql`
        SELECT
          p.id as product_id,
          p.product_code,
          p.description,
          p.category,
          COUNT(soi.id)::int as units_sold,
          SUM(soi.quantity * soi.unit_price)::numeric as revenue,
          COALESCE(ss.avg_cost, p.purchase_price, 0)::numeric as avg_cost_per_unit,
          (SUM(soi.quantity) * COALESCE(ss.avg_cost, p.purchase_price, 0))::numeric as cogs,
          (SUM(soi.quantity * soi.unit_price) - (SUM(soi.quantity) * COALESCE(ss.avg_cost, p.purchase_price, 0)))::numeric as profit,
          CASE
            WHEN SUM(soi.quantity * soi.unit_price) = 0 THEN 0
            ELSE ((SUM(soi.quantity * soi.unit_price) - (SUM(soi.quantity) * COALESCE(ss.avg_cost, p.purchase_price, 0))) / SUM(soi.quantity * soi.unit_price) * 100)::int
          END as margin_percentage,
          CASE
            WHEN SUM(soi.quantity) = 0 THEN 0
            ELSE (SUM(soi.quantity * soi.unit_price) / SUM(soi.quantity))::numeric
          END as avg_selling_price
        FROM products p
        LEFT JOIN sales_order_items soi ON soi.product_id = p.id
        LEFT JOIN sales_order_headers soh ON soh.id = soi.sales_order_id AND soh.order_date >= ${dateFrom} AND soh.order_date <= ${dateTo} AND soh.shop_id = ANY(${shopArray})
        LEFT JOIN stock_summary ss ON ss.product_id = p.id
        WHERE p.is_active = true
        ${filters.category ? Prisma.sql`AND p.category = ${filters.category}` : Prisma.empty}
        GROUP BY p.id, p.product_code, p.description, p.category, ss.avg_cost, p.purchase_price
        HAVING SUM(COALESCE(soi.quantity, 0)) > 0
        ${filters.show_loss_only ? Prisma.sql`AND (SUM(soi.quantity * soi.unit_price) - (SUM(soi.quantity) * COALESCE(ss.avg_cost, p.purchase_price, 0))) < 0` : Prisma.empty}
        ORDER BY ${
          sortBy === 'margin'
            ? Prisma.sql`margin_percentage DESC`
            : sortBy === 'revenue'
              ? Prisma.sql`revenue DESC`
              : Prisma.sql`profit DESC`
        }
        OFFSET ${(page - 1) * limit}
        LIMIT ${limit}
      `),
      this.prisma.$queryRaw<
        Array<{
          total_revenue: string | null;
          total_cogs: string | null;
          total_profit: string | null;
          avg_margin: number | null;
          loss_making_products: number;
          unprofitable_value: string | null;
        }>
      >(Prisma.sql`
        SELECT
          SUM(soi.quantity * soi.unit_price)::text as total_revenue,
          (SUM(soi.quantity) * COALESCE(ss.avg_cost, p.purchase_price, 0))::text as total_cogs,
          (SUM(soi.quantity * soi.unit_price) - (SUM(soi.quantity) * COALESCE(ss.avg_cost, p.purchase_price, 0)))::text as total_profit,
          CASE
            WHEN SUM(soi.quantity * soi.unit_price) = 0 THEN 0
            ELSE ((SUM(soi.quantity * soi.unit_price) - (SUM(soi.quantity) * COALESCE(ss.avg_cost, p.purchase_price, 0))) / SUM(soi.quantity * soi.unit_price) * 100)::int
          END as avg_margin,
          COUNT(CASE WHEN (SUM(soi.quantity * soi.unit_price) - (SUM(soi.quantity) * COALESCE(ss.avg_cost, p.purchase_price, 0))) < 0 THEN 1 END)::int as loss_making_products,
          SUM(CASE WHEN (SUM(soi.quantity * soi.unit_price) - (SUM(soi.quantity) * COALESCE(ss.avg_cost, p.purchase_price, 0))) < 0 THEN ABS(SUM(soi.quantity * soi.unit_price) - (SUM(soi.quantity) * COALESCE(ss.avg_cost, p.purchase_price, 0))) ELSE 0 END)::text as unprofitable_value
        FROM products p
        LEFT JOIN sales_order_items soi ON soi.product_id = p.id
        LEFT JOIN sales_order_headers soh ON soh.id = soi.sales_order_id AND soh.order_date >= ${dateFrom} AND soh.order_date <= ${dateTo} AND soh.shop_id = ANY(${shopArray})
        LEFT JOIN stock_summary ss ON ss.product_id = p.id
        WHERE p.is_active = true
        ${filters.category ? Prisma.sql`AND p.category = ${filters.category}` : Prisma.empty}
        GROUP BY p.id, ss.avg_cost, p.purchase_price
        HAVING SUM(COALESCE(soi.quantity, 0)) > 0
      `),
    ]);

    const totalCount = Number(totalRows[0]?.count ?? 0);
    const summary = summaryRows[0] ?? {
      total_revenue: '0',
      total_cogs: '0',
      total_profit: '0',
      avg_margin: 0,
      loss_making_products: 0,
      unprofitable_value: '0',
    };

    return {
      summary: {
        totalRevenue: Number(summary.total_revenue ?? 0),
        totalCogs: Number(summary.total_cogs ?? 0),
        totalProfit: Number(summary.total_profit ?? 0),
        avgMargin: Number(summary.avg_margin ?? 0),
        lossMakingProducts: summary.loss_making_products,
        unprofitableValue: Number(summary.unprofitable_value ?? 0),
      },
      items: rows.map((r) => {
        const revenue = Number(r.revenue ?? 0);
        const cogs = Number(r.cogs ?? 0);
        const profit = Number(r.profit ?? 0);
        const margin = r.margin_percentage;

        let rank: number;
        let recommendation: 'STOP_SELLING' | 'REDUCE_DISCOUNT' | 'MONITOR' | 'PROMOTE';

        if (margin < 0) {
          rank = 1;
          recommendation = 'STOP_SELLING';
        } else if (margin < 15) {
          rank = 2;
          recommendation = 'REDUCE_DISCOUNT';
        } else if (margin < 25) {
          rank = 3;
          recommendation = 'MONITOR';
        } else {
          rank = 4;
          recommendation = 'PROMOTE';
        }

        return {
          productId: r.product_id,
          productCode: r.product_code,
          name: r.description,
          category: r.category,
          unitsSold: r.units_sold,
          revenue,
          cogs,
          profit,
          marginPercentage: margin,
          avgSellingPrice: Number(r.avg_selling_price ?? 0),
          avgCostPrice: Number(r.avg_cost_per_unit ?? 0),
          profitRank: rank,
          recommendation,
        };
      }),
      pagination: { page, limit, totalCount },
    };
  }

  async actionCenter(
    user: RequestUser,
    filters: {
      shop_id?: string;
    },
  ) {
    await this.assertReportsAllowed(user);
    const shopIds = await this.resolveShopIds(user, filters.shop_id);

    const actions: Array<{
      id: string;
      priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
      category: 'cash-flow' | 'procurement' | 'inventory' | 'pricing' | 'opportunity';
      title: string;
      description: string;
      details: Record<string, any>;
      suggestedAction: string;
      estimatedImpact: string;
      reportSource: string;
    }> = [];

    // 1. Dead Stock Actions
    const deadStockData = await this.deadStock(user, {
      shop_id: filters.shop_id,
      days_unsold: 180,
      limit: 5,
    });

    deadStockData.items
      .filter((item) => item.daysUnsold >= 180 && item.stockValue > 500000)
      .forEach((item) => {
        actions.push({
          id: `dead-${item.productId}`,
          priority: 'CRITICAL',
          category: 'inventory',
          title: `Stop ordering ${item.productCode}`,
          description: `₹${(item.stockValue / 100000).toFixed(1)}L stuck for ${item.daysUnsold} days`,
          details: {
            productCode: item.productCode,
            stockValue: item.stockValue,
            daysUnsold: item.daysUnsold,
          },
          suggestedAction: 'Liquidate through discount or clearance sale',
          estimatedImpact: `Frees up ₹${(item.stockValue / 100000).toFixed(1)}L for other inventory`,
          reportSource: 'dead-stock',
        });
      });

    // 2. Reorder Actions
    const reorderData = await this.reorderIntelligence(user, {
      shop_id: shopIds[0],
      sort_by: 'urgency',
      limit: 5,
    });

    reorderData.items
      .filter((item) => item.urgency === 'HIGH')
      .forEach((item) => {
        actions.push({
          id: `reorder-${item.productId}`,
          priority: 'CRITICAL',
          category: 'procurement',
          title: `Order ${item.productCode} immediately`,
          description: `Stock ends in ${item.daysRemaining} days, need ${item.suggestedOrderQty} units`,
          details: {
            productCode: item.productCode,
            currentStock: item.currentStock,
            daysRemaining: item.daysRemaining,
            suggestedOrderQty: item.suggestedOrderQty,
            avgSalesPerDay: item.avgSalesPerDay,
          },
          suggestedAction: `Place PO for ${item.suggestedOrderQty} units`,
          estimatedImpact: 'Prevents stockout, maintains revenue stream',
          reportSource: 'reorder-intelligence',
        });
      });

    // 3. Customer Aging Actions
    const agingData = await this.customerAging(user, {
      shop_id: filters.shop_id,
      show_overdue_only: true,
      sort_by: 'riskScore',
      limit: 5,
    });

    agingData.items
      .filter((item) => item.riskScore === 'CRITICAL' || (item.riskScore === 'HIGH' && item.overdueAmount > 1000000))
      .forEach((item) => {
        actions.push({
          id: `aging-${item.customerId}`,
          priority: item.riskScore === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          category: 'cash-flow',
          title: `Collect ₹${(item.overdueAmount / 100000).toFixed(1)}L from ${item.customerName}`,
          description: `${item.overdueInvoiceCount} invoice(s) overdue by ${item.avgPaymentDays - 30} days`,
          details: {
            customerId: item.customerId,
            customerName: item.customerName,
            overdueAmount: item.overdueAmount,
            overdueInvoiceCount: item.overdueInvoiceCount,
            riskScore: item.riskScore,
          },
          suggestedAction: item.riskScore === 'CRITICAL' ? 'Call customer immediately, escalate to management' : 'Send payment reminder',
          estimatedImpact: `Improves cash position by ₹${(item.overdueAmount / 100000).toFixed(1)}L`,
          reportSource: 'customer-aging',
        });
      });

    // 4. Product Profitability Actions
    const profitData = await this.productProfitability(user, {
      shop_id: filters.shop_id,
      show_loss_only: true,
      limit: 5,
    });

    profitData.items
      .filter((item) => item.marginPercentage < 0)
      .forEach((item) => {
        actions.push({
          id: `profit-${item.productId}`,
          priority: 'HIGH',
          category: 'pricing',
          title: `${item.productCode}: Selling at loss (${item.marginPercentage}%)`,
          description: `Losing ₹${Math.abs(item.profit / 100000).toFixed(2)}L on ${item.unitsSold} units sold`,
          details: {
            productCode: item.productCode,
            marginPercentage: item.marginPercentage,
            profit: item.profit,
            unitsSold: item.unitsSold,
            avgSellingPrice: item.avgSellingPrice,
            avgCostPrice: item.avgCostPrice,
          },
          suggestedAction: `Increase price from ₹${item.avgSellingPrice.toFixed(0)} to ₹${(item.avgCostPrice * 1.15).toFixed(0)} or stop selling`,
          estimatedImpact: `Stop ₹${Math.abs(item.profit / 100000).toFixed(2)}L monthly loss`,
          reportSource: 'product-profitability',
        });
      });

    // Sort by priority and impact
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
    actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Take top 10 actions
    const topActions = actions.slice(0, 10);

    return {
      generatedAt: new Date().toISOString(),
      actionsSummary: {
        critical: topActions.filter((a) => a.priority === 'CRITICAL').length,
        high: topActions.filter((a) => a.priority === 'HIGH').length,
        medium: topActions.filter((a) => a.priority === 'MEDIUM').length,
      },
      actions: topActions,
    };
  }
}
