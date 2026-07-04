import type { RequestUser } from '@/common/types/request-user';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';
import { StockTransferWriteToolsService } from './stock-transfer-write-tools.service';

const user = {
  id: 'u1',
  shopId: 'shop-1',
  companyId: 'c1',
  tenantShopIds: ['shop-1', 'shop-2'],
  permissions: ['stock_transfer:create', 'product:read'],
} as unknown as RequestUser;

const ctx: AgentToolContext = {
  user,
  companyId: 'c1',
  conversationId: 'conv-1',
  linkId: 'link-1',
};

const hq = { id: 'shop-1', shopName: 'Headquarters' };
const warehouse = { id: 'shop-2', shopName: 'Warehouse B' };
const bulb = { id: 'p1', productCode: 'ELEC0001', description: 'LED Bulb 9W', uom: 'PCS' };
const tube = { id: 'p2', productCode: 'ELEC0002', description: 'LED Tube 20W', uom: 'PCS' };

function buildHarness() {
  const registry = new ToolRegistry();
  const executor = { registerRunner: jest.fn() };
  const tasks = {
    createDraft: jest.fn(async (input: Record<string, unknown>) => ({
      id: 'task-1',
      taskNumber: 800,
      status: 'WAITING_APPROVAL',
      summary: input.summary,
    })),
  };
  const products = {
    get: jest.fn().mockResolvedValue(bulb),
    list: jest.fn().mockResolvedValue({ data: [bulb] }),
  };
  const shops = { list: jest.fn().mockResolvedValue({ data: [hq, warehouse] }) };
  const stockTransfers = {
    create: jest.fn().mockResolvedValue({
      id: 'st-1',
      transferNumber: 'ST-00001',
      items: [{ id: 'line-1' }],
    }),
  };

  const service = new StockTransferWriteToolsService(
    registry,
    executor as never,
    tasks as never,
    products as never,
    shops as never,
    stockTransfers as never,
  );
  service.onModuleInit();
  const tool = registry.get('inventory.create_stock_transfer')!;
  return { registry, executor, tasks, products, shops, stockTransfers, tool };
}

describe('StockTransferWriteToolsService — create_stock_transfer tool', () => {
  it('registers under both the wire name and the domain.action id with Phase 3 metadata', () => {
    const h = buildHarness();
    expect(h.registry.get('create_stock_transfer')).toBe(h.tool);
    expect(h.tool.confirmationRequired).toBe(true);
    expect(h.tool.auditRequired).toBe(true);
    expect(h.tool.requiredPermission).toBe('stock_transfer:create');
    expect(h.tool.featureFlag).toBe('stock');
    expect(h.executor.registerRunner).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'inventory.create_stock_transfer' }),
    );
  });

  it('drafts a task (never creates the transfer) with correct from/to shop and product', async () => {
    const h = buildHarness();
    const result = (await h.tool.handler(ctx, {
      from_shop_id: 'shop-1',
      to_shop_id: 'shop-2',
      items: [{ product_id: 'p1', quantity: 10, uom: 'PCS' }],
    })) as { task_number: number; status: string; summary: string };

    expect(h.stockTransfers.create).not.toHaveBeenCalled();
    expect(result.task_number).toBe(800);
    expect(result.status).toBe('WAITING_APPROVAL');
    expect(result.summary).toContain('Headquarters');
    expect(result.summary).toContain('Warehouse B');
    expect(result.summary).toContain('10 PCS × LED Bulb 9W');

    expect(h.tasks.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'c1',
        type: 'inventory.create_stock_transfer',
        steps: ['inventory.create_stock_transfer'],
        payload: expect.objectContaining({
          fromShopId: 'shop-1',
          toShopId: 'shop-2',
          items: [{ productId: 'p1', quantity: 10, uom: 'PCS' }],
        }),
      }),
    );
  });

  it('resolves shops by name (case-insensitive partial match, exact wins)', async () => {
    const h = buildHarness();
    await h.tool.handler(ctx, {
      from_shop: 'headquarters',
      to_shop: 'Warehouse B',
      items: [{ product_id: 'p1', quantity: 5, uom: 'PCS' }],
    });
    const payload = (h.tasks.createDraft.mock.calls[0][0] as { payload: { fromShopId: string; toShopId: string } }).payload;
    expect(payload.fromShopId).toBe('shop-1');
    expect(payload.toShopId).toBe('shop-2');
  });

  it('clarifies when from and to shop resolve to the same shop', async () => {
    const h = buildHarness();
    const result = (await h.tool.handler(ctx, {
      from_shop_id: 'shop-1',
      to_shop_id: 'shop-1',
      items: [{ product_id: 'p1', quantity: 1, uom: 'PCS' }],
    })) as { clarify?: string };
    expect(result.clarify).toMatch(/must be different/);
    expect(h.tasks.createDraft).not.toHaveBeenCalled();
  });

  it('clarifies when shop name is ambiguous or unknown', async () => {
    const h = buildHarness();
    // Unknown name
    const unknown = (await h.tool.handler(ctx, {
      from_shop: 'no-such-shop',
      to_shop_id: 'shop-2',
      items: [{ product_id: 'p1', quantity: 1, uom: 'PCS' }],
    })) as { clarify?: string };
    expect(unknown.clarify).toMatch(/No source warehouse matches/);
  });

  it('defaults UOM from the product when not supplied', async () => {
    const h = buildHarness();
    await h.tool.handler(ctx, {
      from_shop_id: 'shop-1',
      to_shop_id: 'shop-2',
      items: [{ product_id: 'p1', quantity: 3 }],
    });
    const payload = (h.tasks.createDraft.mock.calls[0][0] as { payload: { items: Array<{ uom: string }> } }).payload;
    expect(payload.items[0].uom).toBe('PCS');
  });

  it('clarifies when product query is ambiguous', async () => {
    const h = buildHarness();
    h.products.list.mockResolvedValue({ data: [bulb, tube] });
    const result = (await h.tool.handler(ctx, {
      from_shop_id: 'shop-1',
      to_shop_id: 'shop-2',
      items: [{ product_query: 'led', quantity: 5, uom: 'PCS' }],
    })) as { clarify?: string; candidates?: unknown[] };
    expect(result.clarify).toMatch(/Multiple products/);
    expect(result.candidates).toHaveLength(2);
  });

  it('rejects future transfer dates and missing conversation context', async () => {
    const h = buildHarness();
    await expect(
      h.tool.handler(ctx, {
        from_shop_id: 'shop-1',
        to_shop_id: 'shop-2',
        transfer_date: '2999-01-01',
        items: [{ product_id: 'p1', quantity: 1, uom: 'PCS' }],
      }),
    ).rejects.toThrow(/future/);
    await expect(
      h.tool.handler({ user } as AgentToolContext, {
        from_shop_id: 'shop-1',
        to_shop_id: 'shop-2',
        items: [{ product_id: 'p1', quantity: 1, uom: 'PCS' }],
      }),
    ).rejects.toThrow(/conversation/);
  });

  it('includes optional storage location ids and notes in the payload', async () => {
    const h = buildHarness();
    await h.tool.handler(ctx, {
      from_shop_id: 'shop-1',
      to_shop_id: 'shop-2',
      from_storage_location_id: 'loc-a',
      to_storage_location_id: 'loc-b',
      notes: 'urgent restock',
      items: [{ product_id: 'p1', quantity: 2, uom: 'PCS' }],
    });
    const payload = (h.tasks.createDraft.mock.calls[0][0] as {
      payload: { fromStorageLocationId?: string; toStorageLocationId?: string; notes?: string };
    }).payload;
    expect(payload.fromStorageLocationId).toBe('loc-a');
    expect(payload.toStorageLocationId).toBe('loc-b');
    expect(payload.notes).toBe('urgent restock');
  });

  it('step runner executes through StockTransfersService with a deterministic idempotency key', async () => {
    const h = buildHarness();
    const runner = h.executor.registerRunner.mock.calls[0][0] as {
      run: (u: unknown, p: unknown, t: unknown, s: unknown) => Promise<unknown>;
      verify: (r: unknown) => void;
      describe: (r: unknown) => string;
    };

    const result = await runner.run(
      user,
      { fromShopId: 'shop-1', toShopId: 'shop-2', transferDate: '2026-07-04', items: [] },
      { id: 'task-1' },
      { order: 1 },
    );
    expect(h.stockTransfers.create).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ fromShopId: 'shop-1', idempotencyKey: 'agent-task:task-1:1' }),
    );
    expect(() => runner.verify(result)).not.toThrow();
    expect(() => runner.verify({})).toThrow(/unexpected result/);
    const desc = runner.describe(result);
    expect(desc).toContain('ST-00001');
    expect(desc).toContain('1 line');
  });
});
