import { Injectable, OnModuleInit } from '@nestjs/common';
import type { RequestUser } from '@/common/types/request-user';
import { DamagedStockService } from '@/modules/damaged-stock/damaged-stock.service';
import { ProductsService } from '@/modules/products/products.service';
import { ShopsService } from '@/modules/shops/shops.service';
import { AgentTaskService } from '../../../tasks/agent-task.service';
import { TaskExecutorService } from '../../../tasks/task-executor.service';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';

const WRITE_OFF = 'inventory.write_off';

type ProductRow = {
  id: string;
  productCode?: string;
  description?: string;
  uom?: string;
};

type WriteOffPayload = {
  shopId: string;
  productId: string;
  productLabel: string;
  damagedQuantity: number;
  reason: string;
  damageDate: string;
  remarks?: string;
};

type DamagedRow = {
  id?: string;
  damageNumber?: string;
  status?: string;
  remarks?: string | null;
};

/**
 * Phase 3 write tool for stock corrections. A write-off is drafted as an
 * AgentTask; on "approve" it creates AND posts a DamagedStock entry through
 * the same service the REST API uses (shop scope, stock availability check,
 * STOCK_ADJUSTMENT ledger movement, AuditLog). Posting is included because
 * the whole point of the tool is that the approval IS the human sign-off.
 * Idempotency: the task marker is stored in remarks and checked before
 * creating, so a retried step never double-posts.
 */
@Injectable()
export class InventoryWriteToolsService implements OnModuleInit {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly executor: TaskExecutorService,
    private readonly tasks: AgentTaskService,
    private readonly products: ProductsService,
    private readonly shops: ShopsService,
    private readonly damaged: DamagedStockService,
  ) {}

  onModuleInit(): void {
    this.registry.register({
      name: 'write_off_stock',
      id: WRITE_OFF,
      description:
        'Draft a stock write-off (damaged / lost / expired units) for the user to approve. This REDUCES stock. ' +
        'It does NOT change stock immediately — the user must reply "approve", which then posts the write-off. ' +
        'A reason is REQUIRED — ask for it if missing. To ADD stock use create_goods_receipt instead. For ' +
        '"set stock of X to N": first call check_stock, then write off the difference if it is a decrease, ' +
        'or advise a goods receipt if it is an increase. Relay the returned summary verbatim.',
      inputSchema: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          product_query: { type: 'string', description: 'Product name or code, used when product_id is unknown' },
          quantity: { type: 'number', exclusiveMinimum: 0, description: 'Units to remove from stock' },
          reason: { type: 'string', description: 'Why the stock is being written off (damaged, lost, expired…)' },
          shop_id: { type: 'string', description: "Warehouse/shop id (defaults to the user's shop)" },
          remarks: { type: 'string' },
        },
        required: ['quantity', 'reason'],
      },
      requiredPermission: 'damage:create',
      featureFlag: 'stock',
      version: 1,
      confirmationRequired: true,
      costLevel: 'low',
      auditRequired: true,
      handler: (ctx, input) => this.draftWriteOff(ctx, input),
    });

    this.executor.registerRunner({
      name: WRITE_OFF,
      run: async (user, payload, task, step) => {
        const data = payload as WriteOffPayload;
        const marker = `agent-task:${task.id}:${step.order}`;

        // Re-run safety: find a row this exact step already created.
        const prior = await this.findByMarker(user, data.shopId, marker);
        if (prior?.id) {
          if (prior.status !== 'POSTED') await this.damaged.post(user, prior.id);
          return this.damaged.get(user, prior.id);
        }

        const created = (await this.damaged.create(user, {
          damageDate: data.damageDate,
          shopId: data.shopId,
          productId: data.productId,
          damagedQuantity: data.damagedQuantity,
          reason: data.reason,
          remarks: [data.remarks, marker].filter(Boolean).join(' | '),
        })) as DamagedRow;
        if (!created.id) throw new Error('Write-off creation returned an unexpected result shape');
        return this.damaged.post(user, created.id);
      },
      verify: (result) => {
        const row = result as DamagedRow;
        if (!row?.id || row.status !== 'POSTED') {
          throw new Error('Write-off did not reach POSTED status');
        }
      },
      describe: (result) => {
        const row = result as DamagedRow;
        return `✅ Stock write-off *${row.damageNumber ?? row.id}* posted — stock has been reduced. You can find it under Damaged Stock in the ERP.`;
      },
    });
  }

  private async draftWriteOff(ctx: AgentToolContext, input: Record<string, unknown>): Promise<unknown> {
    if (!ctx.conversationId || !ctx.companyId) {
      throw new Error('Stock write-off drafting is only available in a chat conversation');
    }
    const quantity = Number(input.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('quantity must be a positive number');
    const reason = String(input.reason ?? '').trim();
    if (!reason) throw new Error('reason is required');

    const shopId = this.resolveShopId(ctx.user, input.shop_id);
    const product = await this.resolveProduct(ctx.user, shopId, input);
    if ('clarify' in product) return product;

    const damageDate = new Date().toISOString().slice(0, 10);
    const payload: WriteOffPayload = {
      shopId,
      productId: product.id,
      productLabel: this.label(product),
      damagedQuantity: quantity,
      reason,
      damageDate,
      ...(typeof input.remarks === 'string' && input.remarks.trim() ? { remarks: input.remarks.trim() } : {}),
    };

    const shopName = await this.shopName(ctx.user, shopId);
    const task = await this.tasks.createDraft({
      companyId: ctx.companyId,
      conversationId: ctx.conversationId,
      requestedById: ctx.user.id,
      type: WRITE_OFF,
      payload,
      summary: [
        `🗑️ *Stock write-off draft*`,
        `Product: ${payload.productLabel}`,
        `Quantity: ${quantity}${product.uom ? ` ${product.uom}` : ''}`,
        `Warehouse: ${shopName}`,
        `Reason: ${reason}`,
        '',
        '⚠️ Approving POSTS this write-off immediately — stock is reduced right away.',
        'Reply *approve* to post it, *cancel* to discard, or tell me what to change.',
      ].join('\n'),
      steps: [WRITE_OFF],
    });

    return {
      task_number: task.taskNumber,
      status: task.status,
      summary: task.summary,
      note: 'Draft created. The user must reply "approve" to post the write-off, "cancel" to discard, or describe changes.',
    };
  }

  private async findByMarker(user: RequestUser, shopId: string, marker: string): Promise<DamagedRow | null> {
    try {
      const result = (await this.damaged.list(user, { shop_id: shopId, take: 50 })) as { data?: DamagedRow[] };
      return (result.data ?? []).find((row) => row.remarks?.includes(marker)) ?? null;
    } catch {
      return null;
    }
  }

  private async resolveProduct(
    user: RequestUser,
    shopId: string,
    input: Record<string, unknown>,
  ): Promise<ProductRow | { clarify: string; candidates?: unknown[] }> {
    if (typeof input.product_id === 'string' && input.product_id.trim()) {
      const product = (await this.products.get(user, input.product_id.trim())) as unknown as ProductRow;
      if (!product?.id) throw new Error('Product could not be resolved');
      return product;
    }
    const query = String(input.product_query ?? '').trim();
    if (!query) throw new Error('product_id or product_query is required');
    const found = await this.products.list(user, { search: query, shop_id: shopId, limit: 5 });
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

  private label(product: ProductRow): string {
    return `${product.description ?? 'product'}${product.productCode ? ` (${product.productCode})` : ''}`;
  }

  private resolveShopId(user: RequestUser, requested: unknown): string {
    const shopId = (typeof requested === 'string' && requested.trim()) || user.shopId || user.tenantShopIds[0];
    if (!shopId) throw new Error('No warehouse/shop is accessible for this account');
    return shopId;
  }

  private async shopName(user: RequestUser, shopId: string): Promise<string> {
    try {
      const result = await this.shops.list(user, {} as never);
      const rows = (result as { data?: Array<{ id: string; shopName?: string }> }).data ?? [];
      return rows.find((row) => row.id === shopId)?.shopName ?? shopId;
    } catch {
      return shopId;
    }
  }
}
