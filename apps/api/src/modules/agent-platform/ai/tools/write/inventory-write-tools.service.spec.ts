import type { RequestUser } from '@/common/types/request-user';
import { ToolRegistry, type AgentToolContext } from '../tool-registry';
import { InventoryWriteToolsService } from './inventory-write-tools.service';

const user = {
  id: 'u1',
  shopId: 'shop-1',
  companyId: 'c1',
  tenantShopIds: ['shop-1'],
  permissions: ['damage:create'],
} as unknown as RequestUser;

const ctx: AgentToolContext = { user, companyId: 'c1', conversationId: 'conv-1', linkId: 'link-1' };

const bulb = { id: 'p1', productCode: 'ELEC0001', description: 'LED Bulb 9W', uom: 'PCS' };

function buildHarness() {
  const registry = new ToolRegistry();
  const executor = { registerRunner: jest.fn() };
  const tasks = {
    createDraft: jest.fn(async (input: Record<string, unknown>) => ({
      id: 'task-1',
      taskNumber: 900,
      status: 'WAITING_APPROVAL',
      summary: input.summary,
    })),
  };
  const products = {
    get: jest.fn().mockResolvedValue(bulb),
    list: jest.fn().mockResolvedValue({ data: [bulb] }),
  };
  const shops = { list: jest.fn().mockResolvedValue({ data: [{ id: 'shop-1', shopName: 'HQ' }] }) };
  const damaged = {
    list: jest.fn().mockResolvedValue({ data: [] }),
    create: jest.fn().mockResolvedValue({ id: 'dmg-1', damageNumber: 'DMG-00001', status: 'DRAFT' }),
    post: jest.fn().mockResolvedValue({ id: 'dmg-1', damageNumber: 'DMG-00001', status: 'POSTED' }),
    get: jest.fn().mockResolvedValue({ id: 'dmg-1', damageNumber: 'DMG-00001', status: 'POSTED' }),
  };

  const service = new InventoryWriteToolsService(
    registry,
    executor as never,
    tasks as never,
    products as never,
    shops as never,
    damaged as never,
  );
  service.onModuleInit();
  const tool = registry.get('inventory.write_off')!;
  const runner = executor.registerRunner.mock.calls[0][0];
  return { registry, executor, tasks, products, shops, damaged, tool, runner };
}

describe('InventoryWriteToolsService — write_off_stock tool', () => {
  it('registers with Phase 3 metadata and a runner', () => {
    const h = buildHarness();
    expect(h.registry.get('write_off_stock')).toBe(h.tool);
    expect(h.tool.confirmationRequired).toBe(true);
    expect(h.tool.requiredPermission).toBe('damage:create');
    expect(h.runner.name).toBe('inventory.write_off');
  });

  it('drafts a task (never posts) with product, quantity and reason', async () => {
    const h = buildHarness();
    const result = (await h.tool.handler(ctx, {
      product_query: 'ELEC0001',
      quantity: 10,
      reason: 'damaged in transit',
    })) as { task_number: number; summary: string };
    expect(result.task_number).toBe(900);
    expect(result.summary).toContain('LED Bulb 9W');
    expect(result.summary).toContain('damaged in transit');
    expect(h.damaged.create).not.toHaveBeenCalled();
    expect(h.damaged.post).not.toHaveBeenCalled();
  });

  it('rejects a missing reason', async () => {
    const h = buildHarness();
    await expect(h.tool.handler(ctx, { product_query: 'ELEC0001', quantity: 5, reason: ' ' })).rejects.toThrow(
      /reason/,
    );
  });

  it('runner creates then posts the write-off with the task marker in remarks', async () => {
    const h = buildHarness();
    const payload = {
      shopId: 'shop-1',
      productId: 'p1',
      productLabel: 'LED Bulb 9W (ELEC0001)',
      damagedQuantity: 10,
      reason: 'damaged in transit',
      damageDate: '2026-07-07',
    };
    const result = await h.runner.run(user, payload, { id: 'task-1' }, { order: 1 });
    expect(h.damaged.create).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ remarks: expect.stringContaining('agent-task:task-1:1') }),
    );
    expect(h.damaged.post).toHaveBeenCalledWith(user, 'dmg-1');
    expect((result as { status: string }).status).toBe('POSTED');
  });

  it('runner is idempotent: a re-run finds the marker and does not create twice', async () => {
    const h = buildHarness();
    h.damaged.list.mockResolvedValue({
      data: [{ id: 'dmg-1', status: 'POSTED', remarks: 'x | agent-task:task-1:1' }],
    });
    await h.runner.run(user, { shopId: 'shop-1' }, { id: 'task-1' }, { order: 1 });
    expect(h.damaged.create).not.toHaveBeenCalled();
  });

  it('verify rejects a non-POSTED result', () => {
    const h = buildHarness();
    expect(() => h.runner.verify({ id: 'dmg-1', status: 'DRAFT' })).toThrow(/POSTED/);
  });
});
