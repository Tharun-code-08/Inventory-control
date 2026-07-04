import type { RequestUser } from '@/common/types/request-user';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';
import { GoodsReceiptWriteToolsService } from './goods-receipt-write-tools.service';

const user = {
  id: 'u1',
  shopId: 'shop-1',
  companyId: 'c1',
  tenantShopIds: ['shop-1'],
  permissions: ['goods_receipt:create', 'product:read'],
} as unknown as RequestUser;

const ctx: AgentToolContext = {
  user,
  companyId: 'c1',
  conversationId: 'conv-1',
  linkId: 'link-1',
};

const bulb = { id: 'p1', productCode: 'ELEC0001', description: 'LED Bulb 9W', uom: 'PCS', purchasePrice: 100 };
const tube = { id: 'p2', productCode: 'ELEC0002', description: 'LED Tube 20W', uom: 'PCS', purchasePrice: 180 };

const rack = { id: 'loc-1', code: 'RACK-A', name: 'Rack A', isActive: true };
const bay = { id: 'loc-2', code: 'BAY-B', name: 'Bay B', isActive: true };

function buildHarness() {
  const registry = new ToolRegistry();
  const executor = { registerRunner: jest.fn() };
  const tasks = {
    createDraft: jest.fn(async (input: Record<string, unknown>) => ({
      id: 'task-1',
      taskNumber: 600,
      status: 'WAITING_APPROVAL',
      summary: input.summary,
    })),
  };
  const products = {
    get: jest.fn().mockResolvedValue(bulb),
    list: jest.fn().mockResolvedValue({ data: [bulb] }),
  };
  const storageLocations = { list: jest.fn().mockResolvedValue([rack]) };
  const shops = { list: jest.fn().mockResolvedValue({ data: [{ id: 'shop-1', shopName: 'Main' }] }) };
  const goodsReceipts = {
    create: jest.fn().mockResolvedValue({
      id: 'gr1',
      grNumber: 'GR-1',
      items: [{ lineValue: 500 }],
    }),
  };

  const service = new GoodsReceiptWriteToolsService(
    registry,
    executor as never,
    tasks as never,
    products as never,
    storageLocations as never,
    shops as never,
    goodsReceipts as never,
  );
  service.onModuleInit();
  const tool = registry.get('purchase.create_gr')!;
  return { registry, executor, tasks, products, storageLocations, shops, goodsReceipts, tool };
}

describe('GoodsReceiptWriteToolsService — create_goods_receipt tool', () => {
  it('registers under both the wire name and the domain.action id with Phase 3 metadata', () => {
    const h = buildHarness();
    expect(h.registry.get('create_goods_receipt')).toBe(h.tool);
    expect(h.tool.confirmationRequired).toBe(true);
    expect(h.tool.auditRequired).toBe(true);
    expect(h.tool.requiredPermission).toBe('goods_receipt:create');
    expect(h.tool.featureFlag).toBe('purchase');
    expect(h.executor.registerRunner).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'purchase.create_gr' }),
    );
  });

  it('drafts a task (never creates the GR) with a service-shaped payload including the storage location', async () => {
    const h = buildHarness();
    const result = (await h.tool.handler(ctx, {
      supplier_name: 'Acme Traders',
      items: [{ product_query: 'bulb', quantity: 5 }],
    })) as { task_number: number; status: string; summary: string };

    expect(h.goodsReceipts.create).not.toHaveBeenCalled();
    expect(result.task_number).toBe(600);
    expect(result.status).toBe('WAITING_APPROVAL');
    expect(result.summary).toContain('Acme Traders');
    expect(result.summary).toContain('5 PCS × LED Bulb 9W (ELEC0001)');
    expect(result.summary).toContain('RACK-A');

    expect(h.tasks.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'c1',
        conversationId: 'conv-1',
        requestedById: 'u1',
        type: 'purchase.create_gr',
        steps: ['purchase.create_gr'],
        payload: expect.objectContaining({
          shopId: 'shop-1',
          supplierName: 'Acme Traders',
          items: [
            {
              productId: 'p1',
              quantity: 5,
              uom: 'PCS',
              purchaseRate: 100,
              storageLocationId: 'loc-1',
            },
          ],
        }),
      }),
    );
  });

  it('defaults the rate to the product purchase price and honors explicit rate/uom/batch/expiry', async () => {
    const h = buildHarness();
    await h.tool.handler(ctx, {
      supplier_name: 'Acme',
      items: [
        {
          product_id: 'p1',
          quantity: 10,
          purchase_rate: 95,
          uom: 'BOX',
          batch_number: 'B-42',
          expiry_date: '2027-01-01',
        },
      ],
    });
    const payload = (h.tasks.createDraft.mock.calls[0][0] as { payload: { items: unknown[] } }).payload;
    expect(payload.items).toEqual([
      {
        productId: 'p1',
        quantity: 10,
        uom: 'BOX',
        purchaseRate: 95,
        storageLocationId: 'loc-1',
        batchNumber: 'B-42',
        expiryDate: '2027-01-01',
      },
    ]);
  });

  it('asks for clarification when multiple storage locations exist and none is specified', async () => {
    const h = buildHarness();
    h.storageLocations.list.mockResolvedValue([rack, bay]);
    const result = (await h.tool.handler(ctx, {
      supplier_name: 'Acme',
      items: [{ product_id: 'p1', quantity: 1 }],
    })) as { clarify?: string; candidates?: unknown[] };
    expect(result.clarify).toMatch(/Multiple storage locations/);
    expect(result.candidates).toHaveLength(2);
    expect(h.tasks.createDraft).not.toHaveBeenCalled();
  });

  it('resolves a storage location by code and reports when the shop has none', async () => {
    const h = buildHarness();
    h.storageLocations.list.mockResolvedValue([rack, bay]);
    await h.tool.handler(ctx, {
      supplier_name: 'Acme',
      storage_location: 'bay-b',
      items: [{ product_id: 'p1', quantity: 1 }],
    });
    const payload = (h.tasks.createDraft.mock.calls[0][0] as {
      payload: { items: Array<{ storageLocationId: string }> };
    }).payload;
    expect(payload.items[0].storageLocationId).toBe('loc-2');

    h.storageLocations.list.mockResolvedValue([]);
    const result = (await h.tool.handler(ctx, {
      supplier_name: 'Acme',
      items: [{ product_id: 'p1', quantity: 1 }],
    })) as { clarify?: string };
    expect(result.clarify).toMatch(/no active storage locations/);
  });

  it('asks for clarification when the product query is ambiguous', async () => {
    const h = buildHarness();
    h.products.list.mockResolvedValue({ data: [bulb, tube] });
    const result = (await h.tool.handler(ctx, {
      supplier_name: 'Acme',
      items: [{ product_query: 'led', quantity: 5 }],
    })) as { clarify?: string; candidates?: unknown[] };
    expect(result.clarify).toMatch(/Multiple products match/);
    expect(result.candidates).toHaveLength(2);
  });

  it('passes purchase_order_id through and flags the link in the summary', async () => {
    const h = buildHarness();
    const result = (await h.tool.handler(ctx, {
      supplier_name: 'Acme',
      purchase_order_id: 'po-1',
      items: [{ product_id: 'p1', quantity: 2 }],
    })) as { summary: string };
    const payload = (h.tasks.createDraft.mock.calls[0][0] as { payload: { purchaseOrderId?: string } }).payload;
    expect(payload.purchaseOrderId).toBe('po-1');
    expect(result.summary).toContain('purchase order');
  });

  it('rejects future GR dates and missing conversation context', async () => {
    const h = buildHarness();
    await expect(
      h.tool.handler(ctx, {
        supplier_name: 'Acme',
        gr_date: '2999-01-01',
        items: [{ product_id: 'p1', quantity: 1 }],
      }),
    ).rejects.toThrow(/future/);
    await expect(
      h.tool.handler({ user } as AgentToolContext, {
        supplier_name: 'Acme',
        items: [{ product_id: 'p1', quantity: 1 }],
      }),
    ).rejects.toThrow(/conversation/);
  });

  it('step runner executes through GoodsReceiptsService with a deterministic idempotency key', async () => {
    const h = buildHarness();
    const runner = h.executor.registerRunner.mock.calls[0][0] as {
      run: (u: unknown, p: unknown, t: unknown, s: unknown) => Promise<unknown>;
      verify: (r: unknown) => void;
      describe: (r: unknown) => string;
    };

    const result = await runner.run(
      user,
      { shopId: 'shop-1', supplierName: 'Acme', items: [] },
      { id: 'task-1' },
      { order: 1 },
    );
    expect(h.goodsReceipts.create).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ supplierName: 'Acme', idempotencyKey: 'agent-task:task-1:1' }),
    );
    expect(() => runner.verify(result)).not.toThrow();
    expect(() => runner.verify({})).toThrow(/unexpected result/);
    expect(runner.describe(result)).toContain('GR-1');
    expect(runner.describe(result)).toContain('₹500');
  });
});
