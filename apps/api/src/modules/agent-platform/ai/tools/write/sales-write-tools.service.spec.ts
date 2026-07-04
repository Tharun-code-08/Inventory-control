import type { RequestUser } from '@/common/types/request-user';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';
import { SalesWriteToolsService } from './sales-write-tools.service';

const user = {
  id: 'u1',
  shopId: 'shop-1',
  companyId: 'c1',
  tenantShopIds: ['shop-1'],
  permissions: ['shop:write', 'product:read'],
} as unknown as RequestUser;

const ctx: AgentToolContext = {
  user,
  companyId: 'c1',
  conversationId: 'conv-1',
  linkId: 'link-1',
};

const bulb = { id: 'p1', productCode: 'ELEC0001', description: 'LED Bulb 9W', sellingPrice: 150 };
const tube = { id: 'p2', productCode: 'ELEC0002', description: 'LED Tube 20W', sellingPrice: 240 };

const acme = { id: 'cust-1', customerCode: 'CUST01', customerName: 'Acme Retail', shopId: 'shop-1' };
const apex = { id: 'cust-2', customerCode: 'CUST02', customerName: 'Apex Stores', shopId: 'shop-1' };

function buildHarness() {
  const registry = new ToolRegistry();
  const executor = { registerRunner: jest.fn() };
  const tasks = {
    createDraft: jest.fn(async (input: Record<string, unknown>) => ({
      id: 'task-1',
      taskNumber: 512,
      status: 'WAITING_APPROVAL',
      summary: input.summary,
    })),
  };
  const products = {
    get: jest.fn().mockResolvedValue(bulb),
    list: jest.fn().mockResolvedValue({ data: [bulb] }),
  };
  const customers = { list: jest.fn().mockResolvedValue({ data: [acme] }) };
  const shops = { list: jest.fn().mockResolvedValue({ data: [{ id: 'shop-1', shopName: 'Main' }] }) };
  const salesOrders = { create: jest.fn().mockResolvedValue({ id: 'so1', soNumber: 'SO-1', totalValue: 300 }) };

  const service = new SalesWriteToolsService(
    registry,
    executor as never,
    tasks as never,
    products as never,
    customers as never,
    shops as never,
    salesOrders as never,
  );
  service.onModuleInit();
  const tool = registry.get('sales.create_so')!;
  return { registry, executor, tasks, products, customers, shops, salesOrders, tool };
}

describe('SalesWriteToolsService — create_sales_order tool', () => {
  it('registers under both the wire name and the domain.action id with Phase 3 metadata', () => {
    const h = buildHarness();
    expect(h.registry.get('create_sales_order')).toBe(h.tool);
    expect(h.tool.confirmationRequired).toBe(true);
    expect(h.tool.auditRequired).toBe(true);
    expect(h.tool.requiredPermission).toBe('shop:write');
    expect(h.tool.featureFlag).toBe('sales');
    expect(h.executor.registerRunner).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'sales.create_so' }),
    );
  });

  it('drafts a task (never creates the SO) with a service-shaped payload', async () => {
    const h = buildHarness();
    const result = (await h.tool.handler(ctx, {
      customer_query: 'Acme Retail',
      items: [{ product_query: 'bulb', quantity: 2 }],
    })) as { task_number: number; status: string; summary: string };

    expect(h.salesOrders.create).not.toHaveBeenCalled();
    expect(result.task_number).toBe(512);
    expect(result.status).toBe('WAITING_APPROVAL');
    expect(result.summary).toContain('Acme Retail');
    expect(result.summary).toContain('2 × LED Bulb 9W (ELEC0001)');

    expect(h.tasks.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'c1',
        conversationId: 'conv-1',
        requestedById: 'u1',
        type: 'sales.create_so',
        steps: ['sales.create_so'],
        payload: expect.objectContaining({
          shopId: 'shop-1',
          customerId: 'cust-1',
          currency: 'INR',
          items: [{ productId: 'p1', quantity: 2, unitPrice: 150 }],
        }),
      }),
    );
  });

  it('defaults the unit price to the product selling price and honors an explicit price', async () => {
    const h = buildHarness();
    await h.tool.handler(ctx, {
      customer_id: 'cust-1',
      items: [{ product_id: 'p1', quantity: 10, unit_price: 145.5 }],
    });
    const payload = (h.tasks.createDraft.mock.calls[0][0] as { payload: { items: unknown[] } }).payload;
    expect(payload.items).toEqual([{ productId: 'p1', quantity: 10, unitPrice: 145.5 }]);
    expect(h.customers.list).not.toHaveBeenCalled();
  });

  it('asks for clarification when the customer query is ambiguous', async () => {
    const h = buildHarness();
    h.customers.list.mockResolvedValue({ data: [acme, apex] });
    const result = (await h.tool.handler(ctx, {
      customer_query: 'a',
      items: [{ product_id: 'p1', quantity: 1 }],
    })) as { clarify?: string; candidates?: unknown[] };

    expect(result.clarify).toMatch(/Multiple customers match/);
    expect(result.candidates).toHaveLength(2);
    expect(h.tasks.createDraft).not.toHaveBeenCalled();
  });

  it('resolves an ambiguous customer list via an exact name match', async () => {
    const h = buildHarness();
    h.customers.list.mockResolvedValue({ data: [acme, apex] });
    await h.tool.handler(ctx, {
      customer_query: 'Apex Stores',
      items: [{ product_id: 'p1', quantity: 1 }],
    });
    const payload = (h.tasks.createDraft.mock.calls[0][0] as { payload: { customerId: string } }).payload;
    expect(payload.customerId).toBe('cust-2');
  });

  it('asks for clarification when no customer matches', async () => {
    const h = buildHarness();
    h.customers.list.mockResolvedValue({ data: [] });
    const result = (await h.tool.handler(ctx, {
      customer_query: 'ghost',
      items: [{ product_id: 'p1', quantity: 1 }],
    })) as { clarify?: string };
    expect(result.clarify).toMatch(/No customer matches/);
  });

  it('asks for clarification when the product query is ambiguous', async () => {
    const h = buildHarness();
    h.products.list.mockResolvedValue({ data: [bulb, tube] });
    const result = (await h.tool.handler(ctx, {
      customer_id: 'cust-1',
      items: [{ product_query: 'led', quantity: 5 }],
    })) as { clarify?: string; candidates?: unknown[] };

    expect(result.clarify).toMatch(/Multiple products match/);
    expect(result.candidates).toHaveLength(2);
    expect(h.tasks.createDraft).not.toHaveBeenCalled();
  });

  it('rejects malformed dates and missing conversation context', async () => {
    const h = buildHarness();
    await expect(
      h.tool.handler(ctx, {
        customer_id: 'cust-1',
        order_date: 'tomorrow',
        items: [{ product_id: 'p1', quantity: 1 }],
      }),
    ).rejects.toThrow(/YYYY-MM-DD/);
    await expect(
      h.tool.handler({ user } as AgentToolContext, {
        customer_id: 'cust-1',
        items: [{ product_id: 'p1', quantity: 1 }],
      }),
    ).rejects.toThrow(/conversation/);
  });

  it('allows a future expected_date and includes it in the payload and summary', async () => {
    const h = buildHarness();
    const result = (await h.tool.handler(ctx, {
      customer_id: 'cust-1',
      expected_date: '2999-01-01',
      items: [{ product_id: 'p1', quantity: 1 }],
    })) as { summary: string };
    const payload = (h.tasks.createDraft.mock.calls[0][0] as { payload: { expectedDate?: string } }).payload;
    expect(payload.expectedDate).toBe('2999-01-01');
    expect(result.summary).toContain('Expected delivery: 2999-01-01');
  });

  it('step runner executes through SalesOrdersService with a deterministic idempotency key', async () => {
    const h = buildHarness();
    const runner = h.executor.registerRunner.mock.calls[0][0] as {
      run: (u: unknown, p: unknown, t: unknown, s: unknown) => Promise<unknown>;
      verify: (r: unknown) => void;
      describe: (r: unknown) => string;
    };

    const result = await runner.run(
      user,
      { shopId: 'shop-1', customerId: 'cust-1', items: [] },
      { id: 'task-1' },
      { order: 1 },
    );
    expect(h.salesOrders.create).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ customerId: 'cust-1', idempotencyKey: 'agent-task:task-1:1' }),
    );
    expect(() => runner.verify(result)).not.toThrow();
    expect(() => runner.verify({})).toThrow(/unexpected result/);
    expect(runner.describe(result)).toContain('SO-1');
  });
});
