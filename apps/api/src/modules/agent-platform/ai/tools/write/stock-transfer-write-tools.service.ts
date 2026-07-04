import { Injectable, OnModuleInit } from '@nestjs/common';
import type { RequestUser } from '@/common/types/request-user';
import { ProductsService } from '@/modules/products/products.service';
import { ShopsService } from '@/modules/shops/shops.service';
import { StockTransfersService } from '@/modules/stock-transfers/stock-transfers.service';
import { AgentTaskService } from '../../../tasks/agent-task.service';
import { TaskExecutorService } from '../../../tasks/task-executor.service';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';

const CREATE_ST = 'inventory.create_stock_transfer';

type StResult = { id?: string; transferNumber?: string; items?: unknown[] };

type ProductRow = {
  id: string;
  productCode?: string;
  description?: string;
  uom?: string;
};

type ShopRow = { id: string; shopName?: string; name?: string };

type ResolvedLine = {
  productId: string;
  label: string;
  quantity: number;
  uom: string;
};

function money(value: unknown): string {
  const num = Number(value ?? 0);
  return `₹${Number.isFinite(num) ? num.toLocaleString('en-IN') : String(value)}`;
}

/**
 * Phase 3 write tools for stock transfers. The tool NEVER creates the transfer:
 * it validates + resolves the request into a service-layer payload, stores it as
 * an AgentTask draft, and the user's explicit "approve" executes it through
 * StockTransfersService with an idempotency key. Like GR, the approved transfer
 * is an ERP DRAFT — stock moves only when a human posts it in the ERP.
 */
@Injectable()
export class StockTransferWriteToolsService implements OnModuleInit {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly executor: TaskExecutorService,
    private readonly tasks: AgentTaskService,
    private readonly products: ProductsService,
    private readonly shops: ShopsService,
    private readonly stockTransfers: StockTransfersService,
  ) {}

  onModuleInit(): void {
    this.registry.register({
      name: 'create_stock_transfer',
      id: CREATE_ST,
      description:
        'Draft a stock transfer between two warehouses (shops) for the user to approve. This does NOT create ' +
        'the transfer — it creates a pending draft; the user must reply "approve" first. The approved transfer ' +
        'is a DRAFT in the ERP — stock only moves when a human posts it. Provide from_shop and to_shop as shop ' +
        'names or ids (both required; must be different shops in the same company). Each item needs product_id ' +
        '(preferred) or exact product_query, plus quantity and uom. Relay the returned summary verbatim.',
      inputSchema: {
        type: 'object',
        properties: {
          from_shop_id: { type: 'string', description: 'Source shop/warehouse id' },
          from_shop: { type: 'string', description: 'Source shop name when id is unknown' },
          to_shop_id: { type: 'string', description: 'Destination shop/warehouse id' },
          to_shop: { type: 'string', description: 'Destination shop name when id is unknown' },
          from_storage_location_id: { type: 'string', description: 'Source storage location id (optional)' },
          to_storage_location_id: { type: 'string', description: 'Destination storage location id (optional)' },
          transfer_date: { type: 'string', description: 'Transfer date YYYY-MM-DD (defaults to today, must not be future)' },
          notes: { type: 'string' },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                product_id: { type: 'string' },
                product_query: { type: 'string', description: 'Product name or code when id is unknown' },
                quantity: { type: 'number', exclusiveMinimum: 0 },
                uom: { type: 'string', description: 'Unit of measure (defaults to the product UOM)' },
              },
              required: ['quantity'],
            },
          },
        },
        required: ['items'],
      },
      requiredPermission: 'stock_transfer:create',
      featureFlag: 'stock',
      version: 1,
      confirmationRequired: true,
      costLevel: 'low',
      auditRequired: true,
      handler: (ctx, input) => this.draftStockTransfer(ctx, input),
    });

    this.executor.registerRunner({
      name: CREATE_ST,
      run: (user, payload, task, step) =>
        this.stockTransfers.create(user, {
          ...(payload as never as Parameters<StockTransfersService['create']>[1]),
          idempotencyKey: `agent-task:${task.id}:${step.order}`,
        }),
      verify: (result) => {
        const st = result as StResult;
        if (!st?.id || !st?.transferNumber) {
          throw new Error('Stock transfer creation returned an unexpected result shape');
        }
      },
      describe: (result) => {
        const st = result as StResult;
        const lineCount = Array.isArray(st.items) ? st.items.length : '?';
        return (
          `✅ Stock transfer *${st.transferNumber}* created as a draft (${lineCount} line${lineCount === 1 ? '' : 's'}). ` +
          'Post it under Stock Transfers in the ERP to move the stock.'
        );
      },
    });
  }

  private async draftStockTransfer(
    ctx: AgentToolContext,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    if (!ctx.conversationId || !ctx.companyId) {
      throw new Error('Stock transfer drafting is only available in a chat conversation');
    }

    const allShops = await this.loadShops(ctx.user);

    const fromShop = await this.resolveShop(allShops, input.from_shop_id, input.from_shop, 'source');
    if ('clarify' in fromShop) return fromShop;

    const toShop = await this.resolveShop(allShops, input.to_shop_id, input.to_shop, 'destination');
    if ('clarify' in toShop) return toShop;

    if (fromShop.id === toShop.id) {
      return { clarify: 'Source and destination warehouses must be different shops. Ask the user which two warehouses to transfer between.' };
    }

    const transferDate = this.resolveTransferDate(input.transfer_date);

    const rawItems = Array.isArray(input.items) ? (input.items as Record<string, unknown>[]) : [];
    if (rawItems.length === 0) throw new Error('At least one item is required');

    const lines: ResolvedLine[] = [];
    for (const raw of rawItems) {
      const resolved = await this.resolveLine(ctx.user, fromShop.id, raw);
      if ('clarify' in resolved) return resolved;
      lines.push(resolved);
    }

    const payload = {
      fromShopId: fromShop.id,
      toShopId: toShop.id,
      transferDate,
      ...(typeof input.from_storage_location_id === 'string' && input.from_storage_location_id.trim()
        ? { fromStorageLocationId: input.from_storage_location_id.trim() }
        : {}),
      ...(typeof input.to_storage_location_id === 'string' && input.to_storage_location_id.trim()
        ? { toStorageLocationId: input.to_storage_location_id.trim() }
        : {}),
      ...(typeof input.notes === 'string' && input.notes.trim()
        ? { notes: input.notes.trim() }
        : {}),
      items: lines.map(({ productId, quantity, uom }) => ({ productId, quantity, uom })),
    };

    const task = await this.tasks.createDraft({
      companyId: ctx.companyId,
      conversationId: ctx.conversationId,
      requestedById: ctx.user.id,
      type: CREATE_ST,
      payload,
      summary: this.buildSummary({
        fromShopName: this.shopLabel(fromShop),
        toShopName: this.shopLabel(toShop),
        transferDate,
        lines,
        notes: payload.notes,
      }),
      steps: [CREATE_ST],
    });

    return {
      task_number: task.taskNumber,
      status: task.status,
      summary: task.summary,
      note: 'Draft created. The user must reply "approve" to create this stock transfer (as an ERP draft — stock moves only on post), "cancel" to discard, or describe changes.',
    };
  }

  private buildSummary(draft: {
    fromShopName: string;
    toShopName: string;
    transferDate: string;
    lines: ResolvedLine[];
    notes?: string;
  }): string {
    const linesList = draft.lines.map(
      (l) => `- ${l.quantity} ${l.uom} × ${l.label}`,
    );
    return [
      `🔄 *Stock transfer draft*`,
      `From: ${draft.fromShopName}`,
      `To: ${draft.toShopName}`,
      `Date: ${draft.transferDate}`,
      ...linesList,
      ...(draft.notes ? [`Notes: ${draft.notes}`] : []),
      '',
      'Reply *approve* to create this stock transfer (as an ERP draft — stock moves only when posted), *cancel* to discard, or tell me what to change.',
    ].join('\n');
  }

  private async loadShops(user: RequestUser): Promise<ShopRow[]> {
    try {
      const result = await this.shops.list(user, {} as never);
      return ((result as { data?: ShopRow[] }).data ?? []) as ShopRow[];
    } catch {
      return [];
    }
  }

  private async resolveShop(
    shops: ShopRow[],
    id: unknown,
    query: unknown,
    role: string,
  ): Promise<ShopRow | { clarify: string; candidates?: unknown[] }> {
    if (typeof id === 'string' && id.trim()) {
      const found = shops.find((s) => s.id === id.trim());
      if (!found) return { clarify: `The ${role} shop id "${id}" was not found in your accessible shops. Ask the user which shop to use.` };
      return found;
    }
    if (typeof query === 'string' && query.trim()) {
      const q = query.trim().toLowerCase();
      const matches = shops.filter(
        (s) => s.shopName?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q),
      );
      if (matches.length === 0) {
        return { clarify: `No ${role} warehouse matches "${query}". Ask the user for the exact shop name.`, candidates: shops.map((s) => ({ id: s.id, name: this.shopLabel(s) })) };
      }
      const exact = matches.filter(
        (s) => s.shopName?.toLowerCase() === q || s.name?.toLowerCase() === q,
      );
      if (matches.length > 1 && exact.length !== 1) {
        return {
          clarify: `Multiple ${role} warehouses match "${query}". Ask the user which one they mean.`,
          candidates: matches.map((s) => ({ id: s.id, name: this.shopLabel(s) })),
        };
      }
      return exact[0] ?? matches[0];
    }
    if (shops.length === 1) return shops[0];
    return {
      clarify: `Which warehouse is the ${role}? Ask the user to specify.`,
      candidates: shops.map((s) => ({ id: s.id, name: this.shopLabel(s) })),
    };
  }

  private shopLabel(shop: ShopRow): string {
    return shop.shopName ?? shop.name ?? shop.id;
  }

  private async resolveLine(
    user: RequestUser,
    shopId: string,
    raw: Record<string, unknown>,
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
      const candidates = (found.data as unknown as ProductRow[]);
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
          candidates: candidates.map((c) => ({ id: c.id, productCode: c.productCode, description: c.description })),
        };
      }
      product = exact[0] ?? candidates[0];
    }
    if (!product?.id) throw new Error('Product could not be resolved');

    const uom =
      (typeof raw.uom === 'string' && raw.uom.trim()) ||
      product.uom?.trim() ||
      'UNIT';

    return {
      productId: product.id,
      label: `${product.description ?? 'product'}${product.productCode ? ` (${product.productCode})` : ''}`,
      quantity,
      uom,
    };
  }

  private resolveTransferDate(requested: unknown): string {
    const today = new Date().toISOString().slice(0, 10);
    if (typeof requested !== 'string' || !requested.trim()) return today;
    const date = requested.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('transfer_date must be YYYY-MM-DD');
    if (date > today) throw new Error('transfer_date cannot be in the future');
    return date;
  }
}
