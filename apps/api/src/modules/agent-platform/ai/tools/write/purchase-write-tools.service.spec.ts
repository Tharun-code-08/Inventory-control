import type { RequestUser } from '@/common/types/request-user';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';
import { PurchaseWriteToolsService } from './purchase-write-tools.service';

const user = {
  id: 'u1',
  shopId: 'shop-1',
  companyId: 'c1',
  tenantShopIds: ['shop-1'],
  permissions: ['purchase_order:create', 'product:read'],
} as unknown as RequestUser;

const ctx: AgentToolContext = {
  user,
  companyId: 'c1',
  conversationId: 'conv-1',
  linkId: 'link-1',
};

const pen = { id: 'p1', productCode: 'PEN-01', description: 'Blue Pen', purchasePrice: 8 };
const pencil = { id: 'p2', productCode: 'PCL-01', description: 'Pencil', purchasePrice: 4 };

function buildHarness() {
  const registry = new ToolRegistry();
  const executor = { registerRunner: jest.fn() };
  const tasks = {
    createDraft: jest.fn(async (input: Record<string, unknown>) => ({
      id: 'task-1',
      taskNumber: 421,
      status: 'WAITING_APPROVAL',
      summary: input.summary,
    })),
  };
  const products = {
    get: jest.fn().mockResolvedValue(pen),
    list: jest.fn().mockResolvedValue({ data: [pen] }),
  };
  const shops = { list: jest.fn().mockResolvedValue({ data: [{ id: 'shop-1', shopName: 'Main' }] }) };
  const purchaseOrders = { create: jest.fn().mockResolvedValue({ id: 'po1', poNumber: 'PO-1', totalValue: 200 }) };

  const service = new PurchaseWriteToolsService(
    registry,
    executor as never,
    tasks as never,
    products as never,
    shops as never,
    purchaseOrders as never,
  );
  service.onModuleInit();
  const tool = registry.get('purchase.create_po')!;
  return { registry, executor, tasks, products, shops, purchaseOrders, tool };
}

describe('PurchaseWriteToolsService — create_purchase_order tool', () => {
  it('registers under both the wire name and the domain.action id with Phase 3 metadata', () => {
    const h = buildHarness();
    expect(h.registry.get('create_purchase_order')).toBe(h.tool);
    expect(h.tool.confirmationRequired).toBe(true);
    expect(h.tool.auditRequired).toBe(true);
    expect(h.tool.requiredPermission).toBe('purchase_order:create');
    expect(h.tool.featureFlag).toBe('purchase');
    expect(h.executor.registerRunner).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'purchase.create_po' }),
    );
  });

  it('drafts a task (never creates the PO) with a service-shaped payload', async () => {
    const h = buildHarness();
    const result = (await h.tool.handler(ctx, {
      supplier: 'Acme Traders',
      items: [{ product_query: 'pen', quantity: 25 }],
    })) as { task_number: number; status: string; summary: string };

    expect(h.purchaseOrders.create).not.toHaveBeenCalled();
    expect(result.task_number).toBe(421);
    expect(result.status).toBe('WAITING_APPROVAL');
    expect(result.summary).toContain('Acme Traders');
    expect(result.summary).toContain('25 × Blue Pen (PEN-01)');

    expect(h.tasks.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'c1',
        conversationId: 'conv-1',
        requestedById: 'u1',
        type: 'purchase.create_po',
        steps: ['purchase.create_po'],
        payload: expect.objectContaining({
          shopId: 'shop-1',
          supplier: 'Acme Traders',
          items: [{ productId: 'p1', orderQty: 25, rate: 8 }],
        }),
      }),
    );
  });

  it('defaults the rate to the product purchase price and honors an explicit rate', async () => {
    const h = buildHarness();
    await h.tool.handler(ctx, {
      supplier: 'Acme',
      items: [{ product_id: 'p1', quantity: 10, rate: 9.5 }],
    });
    const payload = (h.tasks.createDraft.mock.calls[0][0] as { payload: { items: unknown[] } }).payload;
    expect(payload.items).toEqual([{ productId: 'p1', orderQty: 10, rate: 9.5 }]);
  });

  it('asks for clarification when the product query is ambiguous', async () => {
    const h = buildHarness();
    h.products.list.mockResolvedValue({ data: [pen, pencil] });
    const result = (await h.tool.handler(ctx, {
      supplier: 'Acme',
      items: [{ product_query: 'pe', quantity: 5 }],
    })) as { clarify?: string; candidates?: unknown[] };

    expect(result.clarify).toMatch(/Multiple products match/);
    expect(result.candidates).toHaveLength(2);
    expect(h.tasks.createDraft).not.toHaveBeenCalled();
  });

  it('resolves an ambiguous list via an exact code match', async () => {
    const h = buildHarness();
    h.products.list.mockResolvedValue({ data: [pen, pencil] });
    await h.tool.handler(ctx, {
      supplier: 'Acme',
      items: [{ product_query: 'PEN-01', quantity: 5 }],
    });
    const payload = (h.tasks.createDraft.mock.calls[0][0] as { payload: { items: Array<{ productId: string }> } })
      .payload;
    expect(payload.items[0].productId).toBe('p1');
  });

  it('asks for clarification when no product matches', async () => {
    const h = buildHarness();
    h.products.list.mockResolvedValue({ data: [] });
    const result = (await h.tool.handler(ctx, {
      supplier: 'Acme',
      items: [{ product_query: 'ghost', quantity: 5 }],
    })) as { clarify?: string };
    expect(result.clarify).toMatch(/No product matches/);
  });

  it('rejects future PO dates and missing conversation context', async () => {
    const h = buildHarness();
    await expect(
      h.tool.handler(ctx, {
        supplier: 'Acme',
        po_date: '2999-01-01',
        items: [{ product_id: 'p1', quantity: 1 }],
      }),
    ).rejects.toThrow(/future/);
    await expect(
      h.tool.handler({ user } as AgentToolContext, {
        supplier: 'Acme',
        items: [{ product_id: 'p1', quantity: 1 }],
      }),
    ).rejects.toThrow(/conversation/);
  });

  it('step runner executes through PurchaseOrdersService with a deterministic idempotency key', async () => {
    const h = buildHarness();
    const runner = h.executor.registerRunner.mock.calls[0][0] as {
      run: (u: unknown, p: unknown, t: unknown, s: unknown) => Promise<unknown>;
      verify: (r: unknown) => void;
      describe: (r: unknown) => string;
    };

    const result = await runner.run(
      user,
      { shopId: 'shop-1', supplier: 'Acme', items: [] },
      { id: 'task-1' },
      { order: 1 },
    );
    expect(h.purchaseOrders.create).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ supplier: 'Acme', idempotencyKey: 'agent-task:task-1:1' }),
    );
    expect(() => runner.verify(result)).not.toThrow();
    expect(() => runner.verify({})).toThrow(/unexpected result/);
    expect(runner.describe(result)).toContain('PO-1');
  });
});
