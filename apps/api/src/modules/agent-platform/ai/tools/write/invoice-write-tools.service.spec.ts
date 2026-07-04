import type { RequestUser } from '@/common/types/request-user';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';
import { InvoiceWriteToolsService } from './invoice-write-tools.service';

const user = {
  id: 'u1',
  shopId: 'shop-1',
  companyId: 'c1',
  tenantShopIds: ['shop-1'],
  permissions: ['shop:write'],
} as unknown as RequestUser;

const ctx: AgentToolContext = {
  user,
  companyId: 'c1',
  conversationId: 'conv-1',
  linkId: 'link-1',
};

const acme = { id: 'cust-1', customerCode: 'CUST01', customerName: 'Acme Traders', shopId: 'shop-1' };
const apex = { id: 'cust-2', customerCode: 'CUST02', customerName: 'Apex Stores', shopId: 'shop-1' };

const confirmedSo = {
  id: 'so-1',
  soNumber: 'SO-00042',
  status: 'CONFIRMED',
  shopId: 'shop-1',
  customerId: 'cust-1',
  totalValue: 450,
  customer: acme,
};

function buildHarness() {
  const registry = new ToolRegistry();
  const executor = { registerRunner: jest.fn() };
  const tasks = {
    createDraft: jest.fn(async (input: Record<string, unknown>) => ({
      id: 'task-1',
      taskNumber: 700,
      status: 'WAITING_APPROVAL',
      summary: input.summary,
    })),
  };
  const customers = { list: jest.fn().mockResolvedValue({ data: [acme] }) };
  const shops = { list: jest.fn().mockResolvedValue({ data: [{ id: 'shop-1', shopName: 'Main' }] }) };
  const salesOrders = {
    get: jest.fn().mockResolvedValue(confirmedSo),
    list: jest.fn().mockResolvedValue({ data: [confirmedSo] }),
  };
  const invoices = {
    create: jest.fn().mockResolvedValue({ id: 'inv1', invoiceNumber: 'INV-1', totalValue: 450 }),
  };

  const service = new InvoiceWriteToolsService(
    registry,
    executor as never,
    tasks as never,
    customers as never,
    shops as never,
    salesOrders as never,
    invoices as never,
  );
  service.onModuleInit();
  const tool = registry.get('sales.create_invoice')!;
  return { registry, executor, tasks, customers, shops, salesOrders, invoices, tool };
}

describe('InvoiceWriteToolsService — create_invoice tool', () => {
  it('registers under both the wire name and the domain.action id with Phase 3 metadata', () => {
    const h = buildHarness();
    expect(h.registry.get('create_invoice')).toBe(h.tool);
    expect(h.tool.confirmationRequired).toBe(true);
    expect(h.tool.auditRequired).toBe(true);
    expect(h.tool.requiredPermission).toBe('shop:write');
    expect(h.tool.featureFlag).toBe('sales');
    expect(h.executor.registerRunner).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'sales.create_invoice' }),
    );
  });

  it('drafts a task (never issues the invoice) and warns that approval issues + may email', async () => {
    const h = buildHarness();
    const result = (await h.tool.handler(ctx, {
      customer_id: 'cust-1',
      total_value: 1200,
    })) as { task_number: number; status: string; summary: string };

    expect(h.invoices.create).not.toHaveBeenCalled();
    expect(result.task_number).toBe(700);
    expect(result.status).toBe('WAITING_APPROVAL');
    expect(result.summary).toContain('ISSUES this invoice immediately');
    expect(result.summary).toContain('emailed a copy automatically');
    expect(result.summary).toContain('₹1,200');

    expect(h.tasks.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'c1',
        conversationId: 'conv-1',
        requestedById: 'u1',
        type: 'sales.create_invoice',
        steps: ['sales.create_invoice'],
        payload: expect.objectContaining({
          shopId: 'shop-1',
          customerId: 'cust-1',
          totalValue: 1200,
        }),
      }),
    );
  });

  it('invoices a sales order by id — customer, total, and shop default from the order', async () => {
    const h = buildHarness();
    const result = (await h.tool.handler(ctx, { sales_order_id: 'so-1' })) as { summary: string };
    const payload = (h.tasks.createDraft.mock.calls[0][0] as { payload: Record<string, unknown> }).payload;
    expect(payload).toEqual(
      expect.objectContaining({
        shopId: 'shop-1',
        customerId: 'cust-1',
        salesOrderId: 'so-1',
        totalValue: 450,
      }),
    );
    expect(result.summary).toContain('SO-00042');
    expect(result.summary).toContain('Acme Traders');
  });

  it('resolves a sales order by exact number (case-insensitive) and clarifies when unknown', async () => {
    const h = buildHarness();
    await h.tool.handler(ctx, { sales_order_number: 'so-00042' });
    const payload = (h.tasks.createDraft.mock.calls[0][0] as { payload: { salesOrderId?: string } }).payload;
    expect(payload.salesOrderId).toBe('so-1');

    const result = (await h.tool.handler(ctx, { sales_order_number: 'SO-99999' })) as { clarify?: string };
    expect(result.clarify).toMatch(/No recent sales order/);
    expect(h.tasks.createDraft).toHaveBeenCalledTimes(1);
  });

  it('refuses to draft against a DRAFT or CANCELLED sales order', async () => {
    const h = buildHarness();
    h.salesOrders.get.mockResolvedValue({ ...confirmedSo, status: 'DRAFT' });
    const result = (await h.tool.handler(ctx, { sales_order_id: 'so-1' })) as { clarify?: string };
    expect(result.clarify).toMatch(/DRAFT and cannot be invoiced/);
    expect(h.tasks.createDraft).not.toHaveBeenCalled();
  });

  it('an explicit total_value overrides the sales-order total', async () => {
    const h = buildHarness();
    await h.tool.handler(ctx, { sales_order_id: 'so-1', total_value: 500 });
    const payload = (h.tasks.createDraft.mock.calls[0][0] as { payload: { totalValue: number } }).payload;
    expect(payload.totalValue).toBe(500);
  });

  it('asks for clarification when the customer query is ambiguous', async () => {
    const h = buildHarness();
    h.customers.list.mockResolvedValue({ data: [acme, apex] });
    const result = (await h.tool.handler(ctx, {
      customer_query: 'stores',
      total_value: 100,
    })) as { clarify?: string; candidates?: unknown[] };
    expect(result.clarify).toMatch(/Multiple customers/);
    expect(result.candidates).toHaveLength(2);
    expect(h.tasks.createDraft).not.toHaveBeenCalled();
  });

  it('requires total_value without a sales order, and a customer reference', async () => {
    const h = buildHarness();
    await expect(h.tool.handler(ctx, { customer_id: 'cust-1' })).rejects.toThrow(/total_value/);
    await expect(h.tool.handler(ctx, { total_value: 100 })).rejects.toThrow(
      /customer_id, customer_query, or a sales order/,
    );
  });

  it('rejects future invoice dates, due dates before the invoice date, and missing context', async () => {
    const h = buildHarness();
    await expect(
      h.tool.handler(ctx, { customer_id: 'cust-1', total_value: 100, invoice_date: '2999-01-01' }),
    ).rejects.toThrow(/future/);
    await expect(
      h.tool.handler(ctx, {
        customer_id: 'cust-1',
        total_value: 100,
        invoice_date: '2026-07-04',
        due_date: '2026-07-01',
      }),
    ).rejects.toThrow(/before the invoice date/);
    await expect(
      h.tool.handler({ user } as AgentToolContext, { customer_id: 'cust-1', total_value: 100 }),
    ).rejects.toThrow(/conversation/);
  });

  it('step runner executes through InvoicesService with a deterministic idempotency key', async () => {
    const h = buildHarness();
    const runner = h.executor.registerRunner.mock.calls[0][0] as {
      run: (u: unknown, p: unknown, t: unknown, s: unknown) => Promise<unknown>;
      verify: (r: unknown) => void;
      describe: (r: unknown) => string;
    };

    const result = await runner.run(
      user,
      { shopId: 'shop-1', customerId: 'cust-1', totalValue: 450 },
      { id: 'task-1' },
      { order: 1 },
    );
    expect(h.invoices.create).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ customerId: 'cust-1', idempotencyKey: 'agent-task:task-1:1' }),
    );
    expect(() => runner.verify(result)).not.toThrow();
    expect(() => runner.verify({})).toThrow(/unexpected result/);
    expect(runner.describe(result)).toContain('INV-1');
    expect(runner.describe(result)).toContain('₹450');
    expect(runner.describe(result)).toContain('issued');
  });
});
