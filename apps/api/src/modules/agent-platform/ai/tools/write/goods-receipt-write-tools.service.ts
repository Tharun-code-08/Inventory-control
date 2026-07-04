import { Injectable, OnModuleInit } from '@nestjs/common';
import type { RequestUser } from '@/common/types/request-user';
import { GoodsReceiptsService } from '@/modules/goods-receipts/goods-receipts.service';
import { ProductsService } from '@/modules/products/products.service';
import { ShopsService } from '@/modules/shops/shops.service';
import { StorageLocationsService } from '@/modules/storage-locations/storage-locations.service';
import { AgentTaskService } from '../../../tasks/agent-task.service';
import { TaskExecutorService } from '../../../tasks/task-executor.service';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';

const CREATE_GR = 'purchase.create_gr';

type DraftLineInput = {
  product_id?: unknown;
  product_query?: unknown;
  quantity?: unknown;
  purchase_rate?: unknown;
  uom?: unknown;
  batch_number?: unknown;
  expiry_date?: unknown;
};

type ResolvedLine = {
  productId: string;
  label: string;
  quantity: number;
  purchaseRate: number;
  uom: string;
  batchNumber?: string;
  expiryDate?: string;
};

type GrResult = {
  id?: string;
  grNumber?: string;
  items?: Array<{ lineValue?: unknown }>;
};

type ProductRow = {
  id: string;
  productCode?: string;
  description?: string;
  uom?: string;
  purchasePrice?: unknown;
};

type StorageLocationRow = {
  id: string;
  code?: string;
  name?: string;
  isActive?: boolean;
};

function money(value: unknown): string {
  const num = Number(value ?? 0);
  return `₹${Number.isFinite(num) ? num.toLocaleString('en-IN') : String(value)}`;
}

/**
 * Phase 3 write tools for goods receiving. The tool NEVER creates the GR:
 * it validates + resolves the request into a service-layer payload, stores it
 * as an AgentTask draft, and the user's explicit "approve" executes it through
 * GoodsReceiptsService with an idempotency key (same guards as the REST API,
 * including shop scope, storage-location validation, PO over-receive checks,
 * and AuditLog). The created GR is a DRAFT — stock only moves when it is
 * posted in the ERP, so the higher-stakes posting step stays a human action.
 */
@Injectable()
export class GoodsReceiptWriteToolsService implements OnModuleInit {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly executor: TaskExecutorService,
    private readonly tasks: AgentTaskService,
    private readonly products: ProductsService,
    private readonly storageLocations: StorageLocationsService,
    private readonly shops: ShopsService,
    private readonly goodsReceipts: GoodsReceiptsService,
  ) {}

  onModuleInit(): void {
    this.registry.register({
      name: 'create_goods_receipt',
      id: CREATE_GR,
      description:
        'Draft a goods receipt (GRN) for the user to approve. This does NOT create the receipt — it creates a ' +
        'pending draft; the user must reply "approve" before anything is created, and even then the receipt is a ' +
        'DRAFT that must be posted in the ERP before stock changes. Each item needs product_id (preferred) or an ' +
        "exact product_query, plus quantity. purchase_rate defaults to the product's purchase price. " +
        'purchase_order_id may link the receipt to a CONFIRMED purchase order (quantities are validated against ' +
        'it). Relay the returned summary to the user verbatim.',
      inputSchema: {
        type: 'object',
        properties: {
          supplier_name: { type: 'string', description: 'Supplier name as free text' },
          shop_id: { type: 'string', description: 'Warehouse/shop id (defaults to the user\'s shop)' },
          gr_date: { type: 'string', description: 'Receipt date YYYY-MM-DD (defaults to today; must not be in the future)' },
          purchase_order_id: { type: 'string', description: 'Optional purchase order id to receive against' },
          storage_location: { type: 'string', description: 'Storage location code or name (defaults to the shop\'s only active location)' },
          remarks: { type: 'string' },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                product_id: { type: 'string' },
                product_query: { type: 'string', description: 'Product name or code, used when product_id is unknown' },
                quantity: { type: 'number', exclusiveMinimum: 0 },
                purchase_rate: { type: 'number', minimum: 0, description: 'Unit cost in ₹' },
                uom: { type: 'string', description: 'Unit of measure (defaults to the product UoM)' },
                batch_number: { type: 'string' },
                expiry_date: { type: 'string', description: 'Expiry date YYYY-MM-DD (required before the GR can be posted)' },
              },
              required: ['quantity'],
            },
          },
        },
        required: ['supplier_name', 'items'],
      },
      requiredPermission: 'goods_receipt:create',
      featureFlag: 'purchase',
      version: 1,
      confirmationRequired: true,
      costLevel: 'low',
      auditRequired: true,
      handler: (ctx, input) => this.draftGoodsReceipt(ctx, input),
    });

    this.executor.registerRunner({
      name: CREATE_GR,
      run: (user, payload, task, step) =>
        this.goodsReceipts.create(user, {
          ...(payload as never as Parameters<GoodsReceiptsService['create']>[1]),
          // Deterministic per step: a re-run after a transient failure returns
          // the already-created GR instead of creating a duplicate.
          idempotencyKey: `agent-task:${task.id}:${step.order}`,
        }),
      verify: (result) => {
        const gr = result as GrResult;
        if (!gr?.id || !gr?.grNumber) {
          throw new Error('GR creation returned an unexpected result shape');
        }
      },
      describe: (result) => {
        const gr = result as GrResult;
        const total = (gr.items ?? []).reduce((sum, line) => sum + Number(line.lineValue ?? 0), 0);
        return `✅ Goods receipt *${gr.grNumber}* created as a draft (total ${money(total)}). Post it under Goods Receipts in the ERP to update stock.`;
      },
    });
  }

  private async draftGoodsReceipt(
    ctx: AgentToolContext,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    if (!ctx.conversationId || !ctx.companyId) {
      throw new Error('Goods receipt drafting is only available in a chat conversation');
    }
    const supplierName = String(input.supplier_name ?? '').trim();
    if (!supplierName) throw new Error('supplier_name is required');

    const shopId = this.resolveShopId(ctx.user, input.shop_id);
    const grDate = this.resolveGrDate(input.gr_date);

    const location = await this.resolveStorageLocation(ctx.user, shopId, input.storage_location);
    if ('clarify' in location) return location; // model asks the user to disambiguate

    const rawItems = Array.isArray(input.items) ? (input.items as DraftLineInput[]) : [];
    if (rawItems.length === 0) throw new Error('At least one item is required');

    const lines: ResolvedLine[] = [];
    for (const raw of rawItems) {
      const resolved = await this.resolveLine(ctx.user, shopId, raw);
      if ('clarify' in resolved) return resolved; // model asks the user to disambiguate
      lines.push(resolved);
    }

    const total = lines.reduce((sum, line) => sum + line.quantity * line.purchaseRate, 0);
    const shopName = await this.shopName(ctx.user, shopId);
    const purchaseOrderId =
      typeof input.purchase_order_id === 'string' && input.purchase_order_id.trim()
        ? input.purchase_order_id.trim()
        : undefined;
    const payload = {
      shopId,
      grDate,
      supplierName,
      ...(purchaseOrderId ? { purchaseOrderId } : {}),
      ...(typeof input.remarks === 'string' && input.remarks.trim()
        ? { remarks: input.remarks.trim() }
        : {}),
      items: lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        uom: line.uom,
        purchaseRate: line.purchaseRate,
        storageLocationId: location.id,
        ...(line.batchNumber ? { batchNumber: line.batchNumber } : {}),
        ...(line.expiryDate ? { expiryDate: line.expiryDate } : {}),
      })),
    };

    const task = await this.tasks.createDraft({
      companyId: ctx.companyId,
      conversationId: ctx.conversationId,
      requestedById: ctx.user.id,
      type: CREATE_GR,
      payload,
      summary: this.buildSummary({
        supplierName,
        shopName,
        locationLabel: location.code ?? location.name ?? location.id,
        grDate,
        poLinked: Boolean(purchaseOrderId),
        lines,
        total,
        remarks: payload.remarks,
      }),
      steps: [CREATE_GR],
    });

    return {
      task_number: task.taskNumber,
      status: task.status,
      summary: task.summary,
      note: 'Draft created. The user must reply "approve" to create the goods receipt, "cancel" to discard, or describe changes.',
    };
  }

  private buildSummary(draft: {
    supplierName: string;
    shopName: string;
    locationLabel: string;
    grDate: string;
    poLinked: boolean;
    lines: ResolvedLine[];
    total: number;
    remarks?: string;
  }): string {
    const lines = draft.lines.map(
      (l) =>
        `- ${l.quantity} ${l.uom} × ${l.label} @ ${money(l.purchaseRate)} = ${money(l.quantity * l.purchaseRate)}`,
    );
    return [
      `📦 *Goods receipt draft*`,
      `Supplier: ${draft.supplierName}`,
      `Warehouse: ${draft.shopName}`,
      `Storage location: ${draft.locationLabel}`,
      `Date: ${draft.grDate}`,
      ...(draft.poLinked ? ['Linked to a purchase order (quantities will be validated against it).'] : []),
      ...lines,
      `Total: ${money(draft.total)}`,
      ...(draft.remarks ? [`Remarks: ${draft.remarks}`] : []),
      '',
      'Reply *approve* to create this goods receipt (as an ERP draft — stock moves only when it is posted), *cancel* to discard, or tell me what to change.',
    ].join('\n');
  }

  private async resolveStorageLocation(
    user: RequestUser,
    shopId: string,
    requested: unknown,
  ): Promise<StorageLocationRow | { clarify: string; candidates?: unknown[] }> {
    const rows = (await this.storageLocations.list(user, {
      shop_id: shopId,
    })) as unknown as StorageLocationRow[];
    const active = rows.filter((row) => row.isActive !== false);
    if (active.length === 0) {
      return {
        clarify:
          'This warehouse has no active storage locations. Ask the user to create one under Storage Locations in the ERP first.',
      };
    }

    const query = typeof requested === 'string' ? requested.trim() : '';
    if (query) {
      const matches = active.filter(
        (row) =>
          row.code?.toLowerCase() === query.toLowerCase() ||
          row.name?.toLowerCase() === query.toLowerCase(),
      );
      if (matches.length === 1) return matches[0];
      return {
        clarify: `No single storage location matches "${query}". Ask the user which one they mean.`,
        candidates: active.map((row) => ({ id: row.id, code: row.code, name: row.name })),
      };
    }

    if (active.length === 1) return active[0];
    return {
      clarify: 'Multiple storage locations exist for this warehouse. Ask the user which one to receive into.',
      candidates: active.map((row) => ({ id: row.id, code: row.code, name: row.name })),
    };
  }

  private async resolveLine(
    user: RequestUser,
    shopId: string,
    raw: DraftLineInput,
  ): Promise<ResolvedLine | { clarify: string; candidates?: unknown[] }> {
    const quantity = Number(raw.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Each item needs a positive quantity');
    }

    let product: ProductRow | null = null;
    if (typeof raw.product_id === 'string' && raw.product_id.trim()) {
      product = (await this.products.get(user, raw.product_id.trim())) as unknown as ProductRow;
    } else {
      const query = String(raw.product_query ?? '').trim();
      if (!query) throw new Error('Each item needs product_id or product_query');
      const found = await this.products.list(user, { search: query, shop_id: shopId, limit: 5 });
      const candidates = found.data as unknown as ProductRow[];
      if (candidates.length === 0) {
        return { clarify: `No product matches "${query}". Ask the user for the exact product name or code.` };
      }
      const exact = candidates.filter(
        (c) =>
          c.productCode?.toLowerCase() === query.toLowerCase() ||
          c.description?.toLowerCase() === query.toLowerCase(),
      );
      if (candidates.length > 1 && exact.length !== 1) {
        return {
          clarify: `Multiple products match "${query}". Ask the user which one they mean.`,
          candidates: candidates.map((c) => ({
            id: c.id,
            productCode: c.productCode,
            description: c.description,
          })),
        };
      }
      product = exact[0] ?? candidates[0];
    }
    if (!product?.id) throw new Error('Product could not be resolved');

    const purchaseRate =
      raw.purchase_rate !== undefined && raw.purchase_rate !== null
        ? Number(raw.purchase_rate)
        : Number(product.purchasePrice);
    if (!Number.isFinite(purchaseRate) || purchaseRate < 0) {
      return {
        clarify: `No valid unit cost for ${product.description ?? product.id}. Ask the user for the purchase rate.`,
      };
    }

    const uom =
      (typeof raw.uom === 'string' && raw.uom.trim()) || product.uom?.trim() || 'UNIT';
    const batchNumber =
      typeof raw.batch_number === 'string' && raw.batch_number.trim()
        ? raw.batch_number.trim()
        : undefined;
    const expiryDate = this.resolveExpiryDate(raw.expiry_date);

    return {
      productId: product.id,
      label: `${product.description ?? 'product'}${product.productCode ? ` (${product.productCode})` : ''}`,
      quantity,
      purchaseRate,
      uom,
      ...(batchNumber ? { batchNumber } : {}),
      ...(expiryDate ? { expiryDate } : {}),
    };
  }

  private resolveShopId(user: RequestUser, requested: unknown): string {
    const shopId =
      (typeof requested === 'string' && requested.trim()) || user.shopId || user.tenantShopIds[0];
    if (!shopId) throw new Error('No warehouse/shop is accessible for this account');
    return shopId;
  }

  private resolveGrDate(requested: unknown): string {
    const today = new Date().toISOString().slice(0, 10);
    if (typeof requested !== 'string' || !requested.trim()) return today;
    const date = requested.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('gr_date must be YYYY-MM-DD');
    if (date > today) throw new Error('GR date must not be in the future');
    return date;
  }

  private resolveExpiryDate(requested: unknown): string | undefined {
    if (typeof requested !== 'string' || !requested.trim()) return undefined;
    const date = requested.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('expiry_date must be YYYY-MM-DD');
    return date;
  }

  private async shopName(user: RequestUser, shopId: string): Promise<string> {
    try {
      const result = await this.shops.list(user, {} as never);
      const rows = (result as { data?: Array<{ id: string; shopName?: string; name?: string }> }).data ?? [];
      const shop = rows.find((row) => row.id === shopId);
      return shop?.shopName ?? shop?.name ?? shopId;
    } catch {
      return shopId;
    }
  }
}
