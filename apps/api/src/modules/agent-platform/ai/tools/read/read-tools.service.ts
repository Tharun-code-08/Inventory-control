import { Injectable, OnModuleInit } from '@nestjs/common';
import type { RequestUser } from '@/common/types/request-user';
import { PrismaService } from '@/prisma/prisma.service';
import { BarcodesService } from '@/modules/barcodes/barcodes.service';
import { CustomersService } from '@/modules/customers/customers.service';
import { InvoicesService } from '@/modules/invoices/invoices.service';
import { ProductsService } from '@/modules/products/products.service';
import { PurchaseOrdersService } from '@/modules/purchase-orders/purchase-orders.service';
import { ReportsService } from '@/modules/reports/reports.service';
import { SalesOrdersService } from '@/modules/sales-orders/sales-orders.service';
import { ShopsService } from '@/modules/shops/shops.service';
import { SuppliersService } from '@/modules/suppliers/suppliers.service';
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
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly products: ProductsService,
    private readonly barcodes: BarcodesService,
    private readonly shops: ShopsService,
    private readonly suppliers: SuppliersService,
    private readonly customers: CustomersService,
    private readonly purchaseOrders: PurchaseOrdersService,
    private readonly salesOrders: SalesOrdersService,
    private readonly invoices: InvoicesService,
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
        return result.data.map((s) => pick(s, ['id', 'shopName', 'address', 'isActive']));
      },
    });

    this.registry.register({
      name: 'list_suppliers',
      description: 'List suppliers. Use when the user asks "who are my suppliers?", "show suppliers", "list vendors" etc. Optionally filter by name.',
      inputSchema: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Optional name/code search' },
        },
      },
      requiredPermission: 'supplier:read',
      featureFlag: 'purchase',
      handler: async ({ user }, input) => {
        const result = await this.suppliers.list(user, { search: input.search as string | undefined, take: 20 });
        return result.data.map((s) => pick(s, ['id', 'supplierCode', 'supplierName', 'contactPerson', 'phone', 'email', 'isActive']));
      },
    });

    this.registry.register({
      name: 'list_customers',
      description: 'List customers. Use when the user asks "who are my customers?", "show customers" etc. Optionally filter by name.',
      inputSchema: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Optional name/code search' },
        },
      },
      requiredPermission: 'shop:read',
      featureFlag: 'sales',
      handler: async ({ user }, input) => {
        const result = await this.customers.list(user, { search: input.search as string | undefined, take: 20 });
        return result.data.map((c) => pick(c, ['id', 'customerCode', 'customerName', 'phone', 'email', 'isActive']));
      },
    });

    this.registry.register({
      name: 'list_purchase_orders',
      description: 'List recent purchase orders. Use when the user asks "show my POs", "recent purchase orders", "pending POs" etc.',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status: DRAFT, CONFIRMED, RECEIVED, CANCELLED' },
          take: { type: 'number', description: 'How many to return (default 10, max 20)' },
        },
      },
      requiredPermission: 'purchase_order:read',
      featureFlag: 'purchase',
      handler: async ({ user }, input) => {
        const take = Math.min(Number(input.take ?? 10), 20);
        const result = await this.purchaseOrders.list(user, { status: input.status as string | undefined, take } as never);
        return result.data.map((po) => pick(po, ['id', 'poNumber', 'status', 'supplierName', 'totalAmount', 'orderDate', 'expectedDate']));
      },
    });

    this.registry.register({
      name: 'list_sales_orders',
      description: 'List recent sales orders. Use when the user asks "show my SOs", "recent sales orders", "pending orders" etc.',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status: DRAFT, CONFIRMED, DELIVERED, CANCELLED' },
          take: { type: 'number', description: 'How many to return (default 10, max 20)' },
        },
      },
      requiredPermission: 'shop:read',
      featureFlag: 'sales',
      handler: async ({ user }, input) => {
        const take = Math.min(Number(input.take ?? 10), 20);
        const result = await this.salesOrders.list(user, { take } as never);
        return result.data.map((so) => pick(so, ['id', 'soNumber', 'status', 'customerName', 'totalAmount', 'orderDate']));
      },
    });

    this.registry.register({
      name: 'list_invoices',
      description: 'List recent invoices. Use when the user asks "show invoices", "recent invoices", "unpaid invoices" etc.',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status: DRAFT, ISSUED, PAID, CANCELLED' },
          take: { type: 'number', description: 'How many to return (default 10, max 20)' },
        },
      },
      requiredPermission: 'shop:read',
      featureFlag: 'sales',
      handler: async ({ user }, input) => {
        const take = Math.min(Number(input.take ?? 10), 20);
        const result = await this.invoices.list(user, { take } as never);
        return result.data.map((inv) => pick(inv, ['id', 'invoiceNumber', 'status', 'customerName', 'totalValue', 'invoiceDate']));
      },
    });

    this.registry.register({
      name: 'get_business_profile',
      description:
        'Get the current business/account context: company name, the user\'s own name and role, and their shops/warehouses. Use for "what is my company name?", "who am I?", "what shops do I have?", "tell me about my business" and similar account questions.',
      inputSchema: { type: 'object', properties: {} },
      featureFlag: 'stock',
      handler: async ({ user }) => {
        const [company, me, shops] = await Promise.all([
          user.companyId
            ? this.prisma.company.findUnique({
                where: { id: user.companyId },
                select: { companyName: true, companyCode: true, address: true },
              })
            : null,
          this.prisma.user.findUnique({
            where: { id: user.id },
            select: { name: true, email: true, role: { select: { name: true } } },
          }),
          this.prisma.shop.findMany({
            where: { id: { in: user.tenantShopIds } },
            select: { shopName: true, address: true, isActive: true },
          }),
        ]);
        return {
          companyName: company?.companyName ?? 'Unknown',
          companyCode: company?.companyCode ?? undefined,
          companyAddress: company?.address ?? undefined,
          yourName: me?.name ?? undefined,
          yourEmail: me?.email ?? undefined,
          yourRole: me?.role?.name ?? user.role,
          shops: shops.map((s) => pick(s, ['shopName', 'address', 'isActive'])),
        };
      },
    });
  }
}
