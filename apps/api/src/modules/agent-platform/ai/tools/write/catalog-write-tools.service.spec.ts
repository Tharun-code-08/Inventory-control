import type { RequestUser } from '@/common/types/request-user';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';
import { CatalogWriteToolsService } from './catalog-write-tools.service';

const user = {
  id: 'u1',
  shopId: 'shop-1',
  companyId: 'c1',
  tenantShopIds: ['shop-1'],
  permissions: ['product:write'],
} as unknown as RequestUser;

const ctx: AgentToolContext = { user, companyId: 'c1', conversationId: 'conv-1', linkId: 'link-1' };

const panel = {
  id: 'p9',
  productCode: 'ELEC0501',
  description: 'LED Panel 20W',
  uom: 'NOS',
  purchasePrice: 300,
  sellingPrice: 450,
};

function buildHarness() {
  const registry = new ToolRegistry();
  const executor = { registerRunner: jest.fn() };
  const tasks = {
    createDraft: jest.fn(async (input: Record<string, unknown>) => ({
      id: 'task-1',
      taskNumber: 901,
      status: 'WAITING_APPROVAL',
      summary: input.summary,
    })),
  };
  const products = {
    get: jest.fn().mockResolvedValue(panel),
    list: jest.fn().mockResolvedValue({ data: [] }),
    create: jest.fn().mockResolvedValue(panel),
    update: jest.fn().mockResolvedValue({ ...panel, sellingPrice: 899 }),
  };

  const service = new CatalogWriteToolsService(registry, executor as never, tasks as never, products as never);
  service.onModuleInit();
  const createTool = registry.get('catalog.create_product')!;
  const updateTool = registry.get('catalog.update_product')!;
  const runners = Object.fromEntries(
    executor.registerRunner.mock.calls.map((call) => [call[0].name, call[0]]),
  );
  return { registry, executor, tasks, products, createTool, updateTool, runners };
}

describe('CatalogWriteToolsService — create_product', () => {
  it('drafts a task with code, prices and zero opening stock', async () => {
    const h = buildHarness();
    const result = (await h.createTool.handler(ctx, {
      product_code: 'elec0501',
      description: 'LED Panel 20W',
      category: 'Electrical',
      purchase_price: 300,
      selling_price: 450,
    })) as { task_number: number; summary: string };
    expect(result.task_number).toBe(901);
    expect(result.summary).toContain('ELEC0501');
    expect(h.products.create).not.toHaveBeenCalled();
    const payload = h.tasks.createDraft.mock.calls[0][0].payload as Record<string, unknown>;
    expect(payload.plants).toEqual([{ shopId: 'shop-1', openingStock: 0 }]);
  });

  it('clarifies instead of drafting when the code already exists', async () => {
    const h = buildHarness();
    h.products.list.mockResolvedValue({ data: [panel] });
    const result = (await h.createTool.handler(ctx, {
      product_code: 'ELEC0501',
      description: 'x',
      category: 'y',
      purchase_price: 1,
      selling_price: 2,
    })) as { clarify?: string };
    expect(result.clarify).toContain('already exists');
    expect(h.tasks.createDraft).not.toHaveBeenCalled();
  });

  it('runner resolves the existing product when a retry hits the unique code', async () => {
    const h = buildHarness();
    h.products.create.mockRejectedValue(new Error('unique constraint'));
    h.products.list.mockResolvedValue({ data: [panel] });
    const result = await h.runners['catalog.create_product'].run(user, { productCode: 'ELEC0501' });
    expect((result as { id: string }).id).toBe('p9');
  });
});

describe('CatalogWriteToolsService — update_product', () => {
  it('drafts a price change showing old → new', async () => {
    const h = buildHarness();
    h.products.list.mockResolvedValue({ data: [panel] });
    const result = (await h.updateTool.handler(ctx, {
      product_query: 'ELEC0501',
      selling_price: 899,
    })) as { summary: string };
    expect(result.summary).toContain('450');
    expect(result.summary).toContain('899');
    expect(h.products.update).not.toHaveBeenCalled();
    const payload = h.tasks.createDraft.mock.calls[0][0].payload as { changes: Record<string, unknown> };
    expect(payload.changes).toEqual({ sellingPrice: 899 });
  });

  it('rejects an update with no fields', async () => {
    const h = buildHarness();
    h.products.list.mockResolvedValue({ data: [panel] });
    await expect(h.updateTool.handler(ctx, { product_query: 'ELEC0501' })).rejects.toThrow(/No changes/);
  });

  it('runner applies the change through ProductsService.update', async () => {
    const h = buildHarness();
    await h.runners['catalog.update_product'].run(user, {
      productId: 'p9',
      changes: { sellingPrice: 899 },
    });
    expect(h.products.update).toHaveBeenCalledWith(user, 'p9', { sellingPrice: 899 });
  });
});
