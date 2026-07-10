import { Injectable, OnModuleInit } from '@nestjs/common';
import type { RequestUser } from '@/common/types/request-user';
import { ProductsService } from '@/modules/products/products.service';
import { AgentTaskService } from '../../../tasks/agent-task.service';
import { TaskExecutorService } from '../../../tasks/task-executor.service';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';

const CREATE_PRODUCT = 'catalog.create_product';
const UPDATE_PRODUCT = 'catalog.update_product';

type ProductRow = {
  id: string;
  productCode?: string;
  description?: string;
  uom?: string;
  category?: string;
  purchasePrice?: unknown;
  sellingPrice?: unknown;
  gstRate?: unknown;
  isActive?: boolean;
};

type CreateProductPayload = {
  productCode: string;
  description: string;
  category: string;
  uom: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate?: number;
  brand?: string;
  hsnCode?: string;
  plants: Array<{ shopId: string; openingStock: number }>;
};

type UpdateProductPayload = {
  productId: string;
  productLabel: string;
  changes: Record<string, unknown>;
};

function money(value: unknown): string {
  const num = Number(value ?? 0);
  return `₹${Number.isFinite(num) ? num.toLocaleString('en-IN') : String(value)}`;
}

const UPDATABLE_FIELDS: Record<string, string> = {
  selling_price: 'sellingPrice',
  purchase_price: 'purchasePrice',
  description: 'description',
  category: 'category',
  gst_rate: 'gstRate',
  brand: 'brand',
  is_active: 'isActive',
};

/**
 * Phase 3 write tools for the product catalog. Both tools draft an AgentTask;
 * the user's "approve" executes through ProductsService with the same guards
 * as the REST API (shop scope, unique product code, AuditLog).
 * Idempotency: create retries resolve the existing product by its unique
 * code; update is naturally idempotent (same values re-applied).
 */
@Injectable()
export class CatalogWriteToolsService implements OnModuleInit {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly executor: TaskExecutorService,
    private readonly tasks: AgentTaskService,
    private readonly products: ProductsService,
  ) {}

  onModuleInit(): void {
    this.registry.register({
      name: 'create_product',
      id: CREATE_PRODUCT,
      description:
        'Draft a new catalog product for the user to approve. This does NOT create it — the user must reply ' +
        '"approve" first. Required: product_code (short unique code like ELEC0501 — suggest the next in the ' +
        "user's series if they don't give one, but confirm it), description (product name), category, " +
        'purchase_price and selling_price in ₹. The product starts with zero stock — stock is added later via ' +
        'a goods receipt. Relay the returned summary verbatim.',
      inputSchema: {
        type: 'object',
        properties: {
          product_code: { type: 'string', description: 'Unique short code, e.g. ELEC0501' },
          description: { type: 'string', description: 'Product name/description' },
          category: { type: 'string', description: 'Product category, e.g. Electrical' },
          uom: { type: 'string', description: 'Unit of measure (defaults to NOS)' },
          purchase_price: { type: 'number', minimum: 0, description: 'Buy price in ₹' },
          selling_price: { type: 'number', minimum: 0, description: 'Sell price in ₹' },
          gst_rate: { type: 'number', minimum: 0, maximum: 28, description: 'GST % (optional)' },
          brand: { type: 'string' },
          hsn_code: { type: 'string' },
          shop_id: { type: 'string', description: "Warehouse to assign the product to (defaults to the user's shop)" },
        },
        required: ['product_code', 'description', 'category', 'purchase_price', 'selling_price'],
      },
      requiredPermission: 'product:write',
      featureFlag: 'stock',
      version: 1,
      confirmationRequired: true,
      costLevel: 'low',
      auditRequired: true,
      handler: (ctx, input) => this.draftCreateProduct(ctx, input),
    });

    this.registry.register({
      name: 'update_product',
      id: UPDATE_PRODUCT,
      description:
        'Draft a product update (price change, rename, category, GST rate, activate/deactivate) for the user to ' +
        'approve. Use for "change selling price of X to 899", "rename product Y", "deactivate Z". This does NOT ' +
        'apply the change — the user must reply "approve" first. Identify the product with product_id (preferred) ' +
        'or an exact product_query. Relay the returned summary verbatim.',
      inputSchema: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          product_query: { type: 'string', description: 'Product name or code, used when product_id is unknown' },
          selling_price: { type: 'number', minimum: 0, description: 'New sell price in ₹' },
          purchase_price: { type: 'number', minimum: 0, description: 'New buy price in ₹' },
          description: { type: 'string', description: 'New product name/description' },
          category: { type: 'string' },
          gst_rate: { type: 'number', minimum: 0, maximum: 28 },
          brand: { type: 'string' },
          is_active: { type: 'boolean', description: 'false to deactivate, true to reactivate' },
        },
      },
      requiredPermission: 'product:write',
      featureFlag: 'stock',
      version: 1,
      confirmationRequired: true,
      costLevel: 'low',
      auditRequired: true,
      handler: (ctx, input) => this.draftUpdateProduct(ctx, input),
    });

    this.executor.registerRunner({
      name: CREATE_PRODUCT,
      run: async (user, payload) => {
        const dto = payload as CreateProductPayload;
        try {
          return await this.products.create(user, dto as never);
        } catch (err) {
          // Retry safety: the unique product code means a duplicate create can
          // only mean the earlier attempt succeeded — return that product.
          const existing = await this.findByCode(user, dto.productCode);
          if (existing) return existing;
          throw err;
        }
      },
      verify: (result) => {
        const product = result as ProductRow;
        if (!product?.id) throw new Error('Product creation returned an unexpected result shape');
      },
      describe: (result) => {
        const product = result as ProductRow;
        return `✅ Product *${product.description}* (${product.productCode}) created with selling price ${money(product.sellingPrice)}. Add stock via a goods receipt when it arrives.`;
      },
    });

    this.executor.registerRunner({
      name: UPDATE_PRODUCT,
      run: (user, payload) => {
        const data = payload as UpdateProductPayload;
        return this.products.update(user, data.productId, data.changes as never);
      },
      verify: (result) => {
        const product = result as ProductRow;
        if (!product?.id) throw new Error('Product update returned an unexpected result shape');
      },
      describe: (result) => {
        const product = result as ProductRow;
        return `✅ Product *${product.description}* (${product.productCode}) updated. Current prices: buy ${money(product.purchasePrice)} / sell ${money(product.sellingPrice)}.`;
      },
    });
  }

  private async draftCreateProduct(ctx: AgentToolContext, input: Record<string, unknown>): Promise<unknown> {
    if (!ctx.conversationId || !ctx.companyId) {
      throw new Error('Product drafting is only available in a chat conversation');
    }
    const productCode = String(input.product_code ?? '').trim().toUpperCase();
    const description = String(input.description ?? '').trim();
    const category = String(input.category ?? '').trim();
    if (!productCode || !description || !category) {
      throw new Error('product_code, description and category are required');
    }
    const purchasePrice = Number(input.purchase_price);
    const sellingPrice = Number(input.selling_price);
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) throw new Error('purchase_price must be ≥ 0');
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) throw new Error('selling_price must be ≥ 0');

    const existing = await this.findByCode(ctx.user, productCode);
    if (existing) {
      return {
        clarify: `Product code ${productCode} already exists (${existing.description}). Ask the user for a different code, or whether they meant to update the existing product.`,
      };
    }

    const shopId = this.resolveShopId(ctx.user, input.shop_id);
    const payload: CreateProductPayload = {
      productCode,
      description,
      category,
      uom: (typeof input.uom === 'string' && input.uom.trim()) || 'NOS',
      purchasePrice,
      sellingPrice,
      ...(Number.isFinite(Number(input.gst_rate)) && input.gst_rate !== undefined
        ? { gstRate: Number(input.gst_rate) }
        : {}),
      ...(typeof input.brand === 'string' && input.brand.trim() ? { brand: input.brand.trim() } : {}),
      ...(typeof input.hsn_code === 'string' && input.hsn_code.trim() ? { hsnCode: input.hsn_code.trim() } : {}),
      plants: [{ shopId, openingStock: 0 }],
    };

    const task = await this.tasks.createDraft({
      companyId: ctx.companyId,
      conversationId: ctx.conversationId,
      requestedById: ctx.user.id,
      type: CREATE_PRODUCT,
      payload,
      summary: [
        `🆕 *New product draft*`,
        `Code: ${productCode}`,
        `Name: ${description}`,
        `Category: ${category} | UoM: ${payload.uom}`,
        `Buy: ${money(purchasePrice)} | Sell: ${money(sellingPrice)}`,
        ...(payload.gstRate !== undefined ? [`GST: ${payload.gstRate}%`] : []),
        `Starts with zero stock — add stock via a goods receipt.`,
        '',
        'Reply *approve* to create this product, *cancel* to discard, or tell me what to change.',
      ].join('\n'),
      steps: [CREATE_PRODUCT],
    });

    return {
      task_number: task.taskNumber,
      status: task.status,
      summary: task.summary,
      note: 'Draft created. The user must reply "approve" to create the product, "cancel" to discard, or describe changes.',
    };
  }

  private async draftUpdateProduct(ctx: AgentToolContext, input: Record<string, unknown>): Promise<unknown> {
    if (!ctx.conversationId || !ctx.companyId) {
      throw new Error('Product drafting is only available in a chat conversation');
    }

    const product = await this.resolveProduct(ctx.user, input);
    if ('clarify' in product) return product;

    const changes: Record<string, unknown> = {};
    const described: string[] = [];
    for (const [inputKey, dtoKey] of Object.entries(UPDATABLE_FIELDS)) {
      const value = input[inputKey];
      if (value === undefined || value === null) continue;
      if (inputKey === 'is_active') {
        changes[dtoKey] = Boolean(value);
        described.push(`${value ? 'Activate' : 'Deactivate'} the product`);
      } else if (inputKey === 'selling_price' || inputKey === 'purchase_price' || inputKey === 'gst_rate') {
        const num = Number(value);
        if (!Number.isFinite(num) || num < 0) throw new Error(`${inputKey} must be a number ≥ 0`);
        changes[dtoKey] = num;
        const current = inputKey === 'selling_price' ? product.sellingPrice : inputKey === 'purchase_price' ? product.purchasePrice : product.gstRate;
        described.push(
          inputKey === 'gst_rate'
            ? `GST: ${Number(current ?? 0)}% → ${num}%`
            : `${inputKey === 'selling_price' ? 'Sell' : 'Buy'} price: ${money(current)} → ${money(num)}`,
        );
      } else {
        const text = String(value).trim();
        if (!text) continue;
        changes[dtoKey] = text;
        described.push(`${dtoKey}: "${String((product as Record<string, unknown>)[dtoKey] ?? '—')}" → "${text}"`);
      }
    }
    if (Object.keys(changes).length === 0) {
      throw new Error('No changes given — provide at least one field to update (e.g. selling_price)');
    }

    const label = `${product.description ?? 'product'}${product.productCode ? ` (${product.productCode})` : ''}`;
    const payload: UpdateProductPayload = { productId: product.id, productLabel: label, changes };

    const task = await this.tasks.createDraft({
      companyId: ctx.companyId,
      conversationId: ctx.conversationId,
      requestedById: ctx.user.id,
      type: UPDATE_PRODUCT,
      payload,
      summary: [
        `✏️ *Product update draft*`,
        `Product: ${label}`,
        ...described.map((line) => `- ${line}`),
        '',
        'Reply *approve* to apply this change, *cancel* to discard, or tell me what to change.',
      ].join('\n'),
      steps: [UPDATE_PRODUCT],
    });

    return {
      task_number: task.taskNumber,
      status: task.status,
      summary: task.summary,
      note: 'Draft created. The user must reply "approve" to apply the update, "cancel" to discard, or describe changes.',
    };
  }

  private async findByCode(user: RequestUser, code: string): Promise<ProductRow | null> {
    try {
      const found = await this.products.list(user, { search: code, limit: 5 });
      const rows = found.data as unknown as ProductRow[];
      return rows.find((row) => row.productCode?.toLowerCase() === code.toLowerCase()) ?? null;
    } catch {
      return null;
    }
  }

  private async resolveProduct(
    user: RequestUser,
    input: Record<string, unknown>,
  ): Promise<ProductRow | { clarify: string; candidates?: unknown[] }> {
    if (typeof input.product_id === 'string' && input.product_id.trim()) {
      const product = (await this.products.get(user, input.product_id.trim())) as unknown as ProductRow;
      if (!product?.id) throw new Error('Product could not be resolved');
      return product;
    }
    const query = String(input.product_query ?? '').trim();
    if (!query) throw new Error('product_id or product_query is required');
    const found = await this.products.list(user, { search: query, limit: 5 });
    const candidates = found.data as unknown as ProductRow[];
    if (candidates.length === 0) {
      return { clarify: `No product matches "${query}". Ask the user for the exact product name or code.` };
    }
    const exact = candidates.filter(
      (c) => c.productCode?.toLowerCase() === query.toLowerCase() || c.description?.toLowerCase() === query.toLowerCase(),
    );
    if (candidates.length > 1 && exact.length !== 1) {
      return {
        clarify: `Multiple products match "${query}". Ask the user which one they mean.`,
        candidates: candidates.map((c) => ({ id: c.id, productCode: c.productCode, description: c.description })),
      };
    }
    return exact[0] ?? candidates[0];
  }

  private resolveShopId(user: RequestUser, requested: unknown): string {
    const shopId = (typeof requested === 'string' && requested.trim()) || user.shopId || user.tenantShopIds[0];
    if (!shopId) throw new Error('No warehouse/shop is accessible for this account');
    return shopId;
  }
}
