import { Injectable, OnModuleInit } from '@nestjs/common';
import type { RequestUser } from '@/common/types/request-user';
import { BarcodesService } from '@/modules/barcodes/barcodes.service';
import { ProductsService } from '@/modules/products/products.service';
import { ReportsService } from '@/modules/reports/reports.service';
import { ShopsService } from '@/modules/shops/shops.service';
import { ToolRegistry } from '../tool-registry';

/** Pick only known keys, tolerating absent ones — keeps tool output compact. */
function pick(source: unknown, keys: string[]): Record<string, unknown> {
  const row = source as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (row?.[key] !== undefined && row[key] !== null) out[key] = row[key];
  }
  return out;
}

const PRODUCT_KEYS = [
  'id',
  'productCode',
  'code',
  'description',
  'category',
  'uom',
  'sellingPrice',
  'purchasePrice',
  'minStockLevel',
  'currentStock',
  'totalStock',
  'stockByShop',
];

function defaultShopId(user: RequestUser, requested?: unknown): string {
  const shopId = (typeof requested === 'string' && requested) || user.shopId || user.tenantShopIds[0];
  if (!shopId) throw new Error('No warehouse/shop is accessible for this account');
  return shopId;
}

function lastDaysRange(days: number): { date_from: string; date_to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { date_from: from.toISOString(), date_to: to.toISOString() };
}

/**
 * Registers the Phase 2 read-only tools. Every handler calls an existing ERP
 * service with the linked user's RequestUser, so shop-scope checks, tenant
 * isolation, and subscription gates run exactly as they do for the REST API.
 */
@Injectable()
export class ReadToolsService implements OnModuleInit {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly reports: ReportsService,
    private readonly products: ProductsService,
    private readonly barcodes: BarcodesService,
    private readonly shops: ShopsService,
  ) {}

  onModuleInit(): void {
    this.registry.register({
      name: 'check_stock',
      description:
        'Find current stock for a product by (partial) name or product code. Returns matching products with stock per warehouse (stockByShop) and total.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Product name or code to search for' },
          shop_id: { type: 'string', description: 'Optional warehouse/shop id to filter' },
        },
        required: ['query'],
      },
      requiredPermission: 'product:read',
      featureFlag: 'stock',
      handler: async ({ user }, input) => {
        const result = await this.products.list(user, {
          search: String(input.query ?? ''),
          shop_id: typeof input.shop_id === 'string' ? input.shop_id : undefined,
          limit: 5,
        });
        return result.data.map((p) => pick(p, PRODUCT_KEYS));
      },
    });

    this.registry.register({
      name: 'search_products',
      description:
        'Search the product catalog by free text and/or category. Returns up to `limit` products with prices and stock.',
      inputSchema: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          category: { type: 'string' },
          shop_id: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 20 },
        },
      },
      requiredPermission: 'product:read',
      featureFlag: 'stock',
      handler: async ({ user }, input) => {
        const result = await this.products.list(user, {
          search: typeof input.search === 'string' ? input.search : undefined,
          category: typeof input.category === 'string' ? input.category : undefined,
          shop_id: typeof input.shop_id === 'string' ? input.shop_id : undefined,
          limit: typeof input.limit === 'number' ? input.limit : 10,
        });
        return result.data.map((p) => pick(p, PRODUCT_KEYS));
      },
    });

    this.registry.register({
      name: 'product_details',
      description: 'Full details of one product by its id (use check_stock/search_products first to find the id).',
      inputSchema: {
        type: 'object',
        properties: { product_id: { type: 'string' } },
        required: ['product_id'],
      },
      requiredPermission: 'product:read',
      featureFlag: 'stock',
      handler: async ({ user }, input) => {
        const product = await this.products.get(user, String(input.product_id ?? ''));
        return pick(product, [...PRODUCT_KEYS, 'hsnCode', 'gstRate', 'isActive', 'barcodes']);
      },
    });

    this.registry.register({
      name: 'barcode_lookup',
      description: 'Look up a product by scanning/typing an exact barcode.',
      inputSchema: {
        type: 'object',
        properties: { barcode: { type: 'string' } },
        required: ['barcode'],
      },
      requiredPermission: 'product:read',
      featureFlag: 'stock',
      handler: ({ user }, input) => this.barcodes.lookup(user, String(input.barcode ?? '')),
    });

    this.registry.register({
      name: 'low_stock',
      description: 'List products at or below their minimum stock level, optionally per warehouse or category.',
      inputSchema: {
        type: 'object',
        properties: { shop_id: { type: 'string' }, category: { type: 'string' } },
      },
      requiredPermission: 'report:view',
      featureFlag: 'stock',
      handler: ({ user }, input) =>
        this.reports.lowStock(
          user,
          typeof input.shop_id === 'string' ? input.shop_id : undefined,
          typeof input.category === 'string' ? input.category : undefined,
        ),
    });

    this.registry.register({
      name: 'sales_overview',
      description:
        'Sales & operations overview for a date range (defaults to the last 30 days): sales value/count, PO value/count, stock value, low-stock count, goods receipts.',
      inputSchema: {
        type: 'object',
        properties: {
          date_from: { type: 'string', description: 'ISO date, e.g. 2026-07-01' },
          date_to: { type: 'string' },
          shop_id: { type: 'string' },
        },
      },
      requiredPermission: 'report:view',
      featureFlag: 'sales',
      handler: ({ user }, input) =>
        this.reports.analyticsOverview(user, {
          shop_id: typeof input.shop_id === 'string' ? input.shop_id : undefined,
          date_from: typeof input.date_from === 'string' ? input.date_from : undefined,
          date_to: typeof input.date_to === 'string' ? input.date_to : undefined,
        }),
    });

    this.registry.register({
      name: 'top_selling',
      description: 'Fastest-moving products by issued quantity over the last `days` days (default 30).',
      inputSchema: {
        type: 'object',
        properties: {
          shop_id: { type: 'string' },
          days: { type: 'integer', minimum: 1, maximum: 365 },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
        },
      },
      requiredPermission: 'report:view',
      featureFlag: 'sales',
      handler: async ({ user }, input) => {
        const range = lastDaysRange(typeof input.days === 'number' ? input.days : 30);
        const rows = (await this.reports.fastMoving(user, {
          shop_id: defaultShopId(user, input.shop_id),
          ...range,
          limit: typeof input.limit === 'number' ? input.limit : 10,
        })) as unknown[];
        return rows.map((r) => pick(r, ['product_code', 'description', 'total_issued_qty', 'velocity']));
      },
    });

    this.registry.register({
      name: 'reorder_advice',
      description:
        'Reorder intelligence for a warehouse: urgency, days of stock left, and average daily sales per product. Use for "what should I reorder?".',
      inputSchema: {
        type: 'object',
        properties: {
          shop_id: { type: 'string' },
          category: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
        },
      },
      requiredPermission: 'report:view',
      featureFlag: 'purchase',
      handler: ({ user }, input) =>
        this.reports.reorderIntelligence(user, {
          shop_id: defaultShopId(user, input.shop_id),
          category: typeof input.category === 'string' ? input.category : undefined,
          limit: typeof input.limit === 'number' ? input.limit : 10,
        }),
    });

    this.registry.register({
      name: 'warehouses',
      description: "List the company's warehouses/shops with their ids (use these ids as shop_id in other tools).",
      inputSchema: { type: 'object', properties: {} },
      requiredPermission: 'shop:read',
      featureFlag: 'stock',
      handler: async ({ user }) => {
        const result = await this.shops.list(user, {});
        return result.data.map((s) => pick(s, ['id', 'name', 'city', 'isActive']));
      },
    });
  }
}
