import { Injectable, OnModuleInit } from '@nestjs/common';
import type { RequestUser } from '@/common/types/request-user';
import { ProductsService } from '@/modules/products/products.service';
import { PurchaseOrdersService } from '@/modules/purchase-orders/purchase-orders.service';
import { ShopsService } from '@/modules/shops/shops.service';
import { AgentTaskService } from '../../../tasks/agent-task.service';
import { TaskExecutorService } from '../../../tasks/task-executor.service';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';

const CREATE_PO = 'purchase.create_po';

type DraftLineInput = {
  product_id?: unknown;
  product_query?: unknown;
  quantity?: unknown;
  rate?: unknown;
};

type ResolvedLine = {
  productId: string;
  label: string;
  orderQty: number;
  rate: number;
};

type PoResult = { id?: string; poNumber?: string; totalValue?: unknown };

type ProductRow = {
  id: string;
  productCode?: string;
  description?: string;
  purchasePrice?: unknown;
};

function money(value: unknown): string {
  const num = Number(value ?? 0);
  return `₹${Number.isFinite(num) ? num.toLocaleString('en-IN') : String(value)}`;
}

/**
 * Phase 3 write tools for the purchase domain. The tool NEVER creates the PO:
 * it validates + resolves the request into a service-layer payload, stores it
 * as an AgentTask draft, and the user's explicit "approve" executes it through
 * PurchaseOrdersService with an idempotency key (same guards as the REST API,
 * including subscription gate, shop scope, and AuditLog).
 */
@Injectable()
export class PurchaseWriteToolsService implements OnModuleInit {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly executor: TaskExecutorService,
    private readonly tasks: AgentTaskService,
    private readonly products: ProductsService,
    private readonly shops: ShopsService,
    private readonly purchaseOrders: PurchaseOrdersService,
  ) {}

  onModuleInit(): void {
    this.registry.register({
      name: 'create_purchase_order',
      id: CREATE_PO,
      description:
        'Draft a purchase order for the user to approve. This does NOT create the PO — it creates a pending draft; ' +
        'the user must reply "approve" before anything is created. Each item needs product_id (preferred; find it ' +
        'with check_stock/search_products) or an exact product_query, plus quantity. rate (unit price) is optional ' +
        'and defaults to the product\'s purchase price. Relay the returned summary to the user verbatim.',
      inputSchema: {
        type: 'object',
        properties: {
          supplier: { type: 'string', description: 'Supplier name as free text' },
          shop_id: { type: 'string', description: 'Warehouse/shop id (defaults to the user\'s shop)' },
          po_date: { type: 'string', description: 'PO date YYYY-MM-DD (defaults to today; must not be in the future)' },
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
                rate: { type: 'number', minimum: 0, description: 'Unit price in ₹' },
              },
              required: ['quantity'],
            },
          },
        },
        required: ['supplier', 'items'],
      },
      requiredPermission: 'purchase_order:create',
      featureFlag: 'purchase',
      version: 1,
      confirmationRequired: true,
      costLevel: 'low',
      auditRequired: true,
      handler: (ctx, input) => this.draftPurchaseOrder(ctx, input),
    });

    this.executor.registerRunner({
      name: CREATE_PO,
      run: (user, payload, task, step) =>
        this.purchaseOrders.create(user, {
          ...(payload as never as Parameters<PurchaseOrdersService['create']>[1]),
          // Deterministic per step: a re-run after a transient failure returns
          // the already-created PO instead of creating a duplicate.
          idempotencyKey: `agent-task:${task.id}:${step.order}`,
        }),
      verify: (result) => {
        const po = result as PoResult;
        if (!po?.id || !po?.poNumber) {
          throw new Error('PO creation returned an unexpected result shape');
        }
      },
      describe: (result) => {
        const po = result as PoResult;
        return `✅ Purchase order *${po.poNumber}* created (total ${money(po.totalValue)}). You can find it under Purchase Orders in the ERP.`;
      },
    });
  }

  private async draftPurchaseOrder(
    ctx: AgentToolContext,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    if (!ctx.conversationId || !ctx.companyId) {
      throw new Error('Purchase drafting is only available in a chat conversation');
    }
    const supplier = String(input.supplier ?? '').trim();
    if (!supplier) throw new Error('supplier is required');

    const shopId = this.resolveShopId(ctx.user, input.shop_id);
    const poDate = this.resolvePoDate(input.po_date);
    const rawItems = Array.isArray(input.items) ? (input.items as DraftLineInput[]) : [];
    if (rawItems.length === 0) throw new Error('At least one item is required');

    const lines: ResolvedLine[] = [];
    for (const raw of rawItems) {
      const resolved = await this.resolveLine(ctx.user, shopId, raw);
      if ('clarify' in resolved) return resolved; // model asks the user to disambiguate
      lines.push(resolved);
    }

    const total = lines.reduce((sum, line) => sum + line.orderQty * line.rate, 0);
    const shopName = await this.shopName(ctx.user, shopId);
    const payload = {
      shopId,
      poDate,
      supplier,
      ...(typeof input.remarks === 'string' && input.remarks.trim()
        ? { remarks: input.remarks.trim() }
        : {}),
      items: lines.map(({ productId, orderQty, rate }) => ({ productId, orderQty, rate })),
    };

    const task = await this.tasks.createDraft({
      companyId: ctx.companyId,
      conversationId: ctx.conversationId,
      requestedById: ctx.user.id,
      type: CREATE_PO,
      payload,
      summary: this.buildSummary({ supplier, shopName, poDate, lines, total, remarks: payload.remarks }),
      steps: [CREATE_PO],
    });

    return {
      task_number: task.taskNumber,
      status: task.status,
      summary: task.summary,
      note: 'Draft created. The user must reply "approve" to create the PO, "cancel" to discard, or describe changes.',
    };
  }

  private buildSummary(draft: {
    supplier: string;
    shopName: string;
    poDate: string;
    lines: ResolvedLine[];
    total: number;
    remarks?: string;
  }): string {
    const lines = draft.lines.map(
      (l) => `- ${l.orderQty} × ${l.label} @ ${money(l.rate)} = ${money(l.orderQty * l.rate)}`,
    );
    return [
      `📝 *Purchase order draft*`,
      `Supplier: ${draft.supplier}`,
      `Warehouse: ${draft.shopName}`,
      `Date: ${draft.poDate}`,
      ...lines,
      `Total: ${money(draft.total)}`,
      ...(draft.remarks ? [`Remarks: ${draft.remarks}`] : []),
      '',
      'Reply *approve* to create this PO, *cancel* to discard, or tell me what to change.',
    ].join('\n');
  }

  private async resolveLine(
    user: RequestUser,
    shopId: string,
    raw: DraftLineInput,
  ): Promise<ResolvedLine | { clarify: string; candidates?: unknown[] }> {
    const orderQty = Number(raw.quantity);
    if (!Number.isFinite(orderQty) || orderQty <= 0) {
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

    const rate = raw.rate !== undefined && raw.rate !== null ? Number(raw.rate) : Number(product.purchasePrice);
    if (!Number.isFinite(rate) || rate < 0) {
      return {
        clarify: `No valid unit price for ${product.description ?? product.id}. Ask the user for the rate.`,
      };
    }

    return {
      productId: product.id,
      label: `${product.description ?? 'product'}${product.productCode ? ` (${product.productCode})` : ''}`,
      orderQty,
      rate,
    };
  }

  private resolveShopId(user: RequestUser, requested: unknown): string {
    const shopId =
      (typeof requested === 'string' && requested.trim()) || user.shopId || user.tenantShopIds[0];
    if (!shopId) throw new Error('No warehouse/shop is accessible for this account');
    return shopId;
  }

  private resolvePoDate(requested: unknown): string {
    const today = new Date().toISOString().slice(0, 10);
    if (typeof requested !== 'string' || !requested.trim()) return today;
    const date = requested.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('po_date must be YYYY-MM-DD');
    if (date > today) throw new Error('PO date must not be in the future');
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
