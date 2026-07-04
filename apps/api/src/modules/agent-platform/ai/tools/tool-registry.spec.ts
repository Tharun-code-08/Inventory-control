import type { RequestUser } from '@/common/types/request-user';
import { ToolRegistry, type AgentTool } from './tool-registry';

const user = (permissions: string[]): RequestUser => ({
  id: 'u1',
  email: 'u@example.com',
  role: 'STAFF' as RequestUser['role'],
  shopId: 's1',
  companyId: 'c1',
  tenantShopIds: ['s1'],
  permissions,
});

const tool = (overrides: Partial<AgentTool>): AgentTool => ({
  name: 'demo',
  description: 'demo tool',
  inputSchema: { type: 'object', properties: {} },
  featureFlag: 'stock',
  handler: async () => 'ok',
  ...overrides,
});

describe('ToolRegistry', () => {
  it('rejects duplicate registrations', () => {
    const registry = new ToolRegistry();
    registry.register(tool({ name: 'a' }));
    expect(() => registry.register(tool({ name: 'a' }))).toThrow(/already registered/);
  });

  it('hides tools the user lacks permission for', () => {
    const registry = new ToolRegistry();
    registry.register(tool({ name: 'open' }));
    registry.register(tool({ name: 'gated', requiredPermission: 'report:view' }));

    const visible = registry.listFor(user(['product:read']), {});
    expect(visible.map((t) => t.name)).toEqual(['open']);

    const visibleWithPerm = registry.listFor(user(['report:view']), {});
    expect(visibleWithPerm.map((t) => t.name)).toEqual(['open', 'gated']);
  });

  it('hides tools whose feature flag is disabled for the tenant', () => {
    const registry = new ToolRegistry();
    registry.register(tool({ name: 'stock_tool', featureFlag: 'stock' }));
    registry.register(tool({ name: 'sales_tool', featureFlag: 'sales' }));

    const visible = registry.listFor(user([]), { sales: false });
    expect(visible.map((t) => t.name)).toEqual(['stock_tool']);
  });

  it('maps tools to provider definitions without handlers', () => {
    const registry = new ToolRegistry();
    registry.register(tool({ name: 'a' }));
    const defs = registry.toDefs(registry.listFor(user([]), {}));
    expect(defs).toEqual([
      { name: 'a', description: 'demo tool', inputSchema: { type: 'object', properties: {} } },
    ]);
  });
});
