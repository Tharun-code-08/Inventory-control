import type { RequestUser } from '@/common/types/request-user';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';
import { PartnerWriteToolsService } from './partner-write-tools.service';

const user = {
  id: 'u1',
  shopId: 'shop-1',
  companyId: 'c1',
  tenantShopIds: ['shop-1'],
  permissions: ['supplier:write', 'shop:write'],
} as unknown as RequestUser;

const ctx: AgentToolContext = { user, companyId: 'c1', conversationId: 'conv-1', linkId: 'link-1' };

function buildHarness() {
  const registry = new ToolRegistry();
  const executor = { registerRunner: jest.fn() };
  const tasks = {
    createDraft: jest.fn(async (input: Record<string, unknown>) => ({
      id: 'task-1',
      taskNumber: 902,
      status: 'WAITING_APPROVAL',
      summary: input.summary,
    })),
  };
  const suppliers = {
    list: jest.fn().mockResolvedValue({ data: [] }),
    create: jest.fn().mockResolvedValue({ id: 's1', supplierCode: 'SUP-001', supplierName: 'Tharun Supplies' }),
  };
  const customers = {
    list: jest.fn().mockResolvedValue({ data: [] }),
    create: jest.fn().mockResolvedValue({ id: 'cu1', customerCode: 'CUST-001', customerName: 'Acme Traders' }),
  };

  const service = new PartnerWriteToolsService(
    registry,
    executor as never,
    tasks as never,
    suppliers as never,
    customers as never,
  );
  service.onModuleInit();
  const supplierTool = registry.get('partner.create_supplier')!;
  const customerTool = registry.get('partner.create_customer')!;
  const runners = Object.fromEntries(
    executor.registerRunner.mock.calls.map((call) => [call[0].name, call[0]]),
  );
  return { registry, tasks, suppliers, customers, supplierTool, customerTool, runners };
}

describe('PartnerWriteToolsService — create_supplier', () => {
  it('drafts a task without creating the supplier', async () => {
    const h = buildHarness();
    const result = (await h.supplierTool.handler(ctx, {
      name: 'Tharun Supplies',
      phone: '9025560686',
    })) as { task_number: number; summary: string };
    expect(result.task_number).toBe(902);
    expect(result.summary).toContain('Tharun Supplies');
    expect(h.suppliers.create).not.toHaveBeenCalled();
  });

  it('clarifies when a supplier with the same name exists', async () => {
    const h = buildHarness();
    h.suppliers.list.mockResolvedValue({ data: [{ id: 's1', supplierName: 'Tharun Supplies' }] });
    const result = (await h.supplierTool.handler(ctx, { name: 'tharun supplies' })) as { clarify?: string };
    expect(result.clarify).toContain('already exists');
    expect(h.tasks.createDraft).not.toHaveBeenCalled();
  });

  it('runner returns the existing supplier instead of duplicating on re-run', async () => {
    const h = buildHarness();
    h.suppliers.list.mockResolvedValue({ data: [{ id: 's1', supplierName: 'Tharun Supplies' }] });
    const result = await h.runners['partner.create_supplier'].run(user, { supplierName: 'Tharun Supplies' });
    expect((result as { id: string }).id).toBe('s1');
    expect(h.suppliers.create).not.toHaveBeenCalled();
  });
});

describe('PartnerWriteToolsService — create_customer', () => {
  it('drafts a task without creating the customer', async () => {
    const h = buildHarness();
    const result = (await h.customerTool.handler(ctx, { name: 'Acme Traders' })) as { summary: string };
    expect(result.summary).toContain('Acme Traders');
    expect(h.customers.create).not.toHaveBeenCalled();
  });

  it('runner creates the customer through CustomersService', async () => {
    const h = buildHarness();
    const result = await h.runners['partner.create_customer'].run(user, { customerName: 'Acme Traders' });
    expect(h.customers.create).toHaveBeenCalled();
    expect((result as { id: string }).id).toBe('cu1');
  });
});
