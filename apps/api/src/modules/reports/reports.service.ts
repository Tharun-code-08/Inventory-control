import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, requireCompanyId, shopIdsForUser, shopListWhere } from '../../common/utils/shop-scope';
import { SubscriptionService } from '../billing/subscription.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
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

    const summaryKeys = assignments.map((a) => ({ shopId: a.shopId, productId: a.productId }));
    const summaries = summaryKeys.length
      ? await this.prisma.stockSummary.findMany({
          where: {
            OR: summaryKeys.map((k) => ({ shopId: k.shopId, productId: k.productId })),
          },
          select: { shopId: true, productId: true, currentStock: true },
        })
      : [];
    const stockByKey = new Map(
      summaries.map((s) => [`${s.shopId}:${s.productId}`, s.currentStock]),
    );

    return assignments
      .map((a) => ({
        product_id: a.productId,
        product_code: a.product.productCode,
        description: a.product.description,
        category: a.product.category,
        shop_id: a.shopId,
        current_stock: stockByKey.get(`${a.shopId}:${a.productId}`) ?? new Prisma.Decimal(0),
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

  async grRegister(user: RequestUser, date_from?: string, date_to?: string, shop_id?: string) {
    await this.assertReportsAllowed(user);
    const shopWhere = this.shopWhere(user, shop_id);
    const { from, to } = this.resolveDateRange(date_from, date_to);
    return this.prisma.goodsReceiptHeader.findMany({
      where: {
        grDate: { gte: from, lte: to },
        shop: shopWhere,
        ...(shop_id ? { shopId: shop_id } : {}),
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

  async shopSummary(user: RequestUser, shop_id?: string) {
    await this.assertReportsAllowed(user);
    const tenantShops = shopIdsForUser(user) ?? [];
    if (shop_id) assertShopScope(user, shop_id);
    const allowedShops = shop_id ? [shop_id] : tenantShops;
    if (allowedShops.length === 0) {
      throw new ForbiddenException('Organisation scope is required');
    }
    const shopArray = Prisma.sql`ARRAY[${Prisma.join(
      allowedShops.map((id) => Prisma.sql`${id}::uuid`),
    )}]::uuid[]`;
    const rows = await this.prisma.$queryRaw<
      { shop_id: string; shop_name: string; sku_count: number; stock_value: Prisma.Decimal | null }[]
    >(Prisma.sql`
      SELECT sh.id as shop_id, sh.shop_name,
             COUNT(DISTINCT p.id)::int as sku_count,
             SUM(COALESCE(ss.current_stock,0) * p.purchase_price) as stock_value
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
    }));
  }
}
