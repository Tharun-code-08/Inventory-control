import type { UserChannelLink } from '@prisma/client';
import type { RequestUser } from '@/common/types/request-user';
import { ToolRegistry } from '../ai/tools/tool-registry';
import type { AgentTaskWithSteps } from './agent-task.service';
import { TaskFlowService, TASK_REPLIES } from './task-flow.service';

const link = { id: 'link-1', userId: 'u1', companyId: 'c1' } as UserChannelLink;

const requestUser = {
  id: 'u1',
  permissions: ['purchase_order:create'],
} as unknown as RequestUser;

const pending = {
  id: 't1',
  taskNumber: 421,
  type: 'purchase.create_po',
  summary: 'PO draft summary',
  steps: [],
} as unknown as AgentTaskWithSteps;

function buildHarness() {
  const registry = new ToolRegistry();
  registry.register({
    name: 'create_purchase_order',
    id: 'purchase.create_po',
    description: 'draft',
    inputSchema: { type: 'object' },
    requiredPermission: 'purchase_order:create',
    featureFlag: 'purchase',
    handler: jest.fn(),
  });
  const links = { buildRequestUser: jest.fn().mockResolvedValue(requestUser) };
  const tasks = {
    approveTransition: jest.fn().mockResolvedValue(true),
    cancel: jest.fn().mockResolvedValue(true),
    complete: jest.fn().mockResolvedValue(undefined),
    fail: jest.fn().mockResolvedValue(undefined),
  };
  const executor = {
    execute: jest.fn().mockResolvedValue({ ok: true, reply: '✅ PO created', result: { id: 'po1' } }),
  };
  const service = new TaskFlowService(links as never, tasks as never, executor as never, registry);
  return { service, links, tasks, executor };
}

describe('TaskFlowService.handleDecision', () => {
  it('returns null for non-decisions so the edit path can take over', async () => {
    const h = buildHarness();
    await expect(h.service.handleDecision(link, pending, 'change qty to 25')).resolves.toBeNull();
    expect(h.executor.execute).not.toHaveBeenCalled();
    expect(h.tasks.cancel).not.toHaveBeenCalled();
  });

  it('approve: transitions, executes, completes, and returns the runner reply', async () => {
    const h = buildHarness();
    await expect(h.service.handleDecision(link, pending, 'approve')).resolves.toBe('✅ PO created');
    expect(h.tasks.approveTransition).toHaveBeenCalledWith('t1', 'u1');
    expect(h.executor.execute).toHaveBeenCalledWith(requestUser, pending);
    expect(h.tasks.complete).toHaveBeenCalledWith('t1', { id: 'po1' });
  });

  it('double-approve: second transition fails → no second execution', async () => {
    const h = buildHarness();
    h.tasks.approveTransition.mockResolvedValue(false);
    await expect(h.service.handleDecision(link, pending, 'yes')).resolves.toBe(
      TASK_REPLIES.alreadyDecided(421),
    );
    expect(h.executor.execute).not.toHaveBeenCalled();
  });

  it('re-checks the permission at approval time and cancels when it was revoked', async () => {
    const h = buildHarness();
    h.links.buildRequestUser.mockResolvedValue({ ...requestUser, permissions: [] });
    await expect(h.service.handleDecision(link, pending, 'approve')).resolves.toBe(
      TASK_REPLIES.permissionLost(421, 'purchase_order:create'),
    );
    expect(h.tasks.cancel).toHaveBeenCalled();
    expect(h.executor.execute).not.toHaveBeenCalled();
  });

  it('refuses when the linked account went inactive', async () => {
    const h = buildHarness();
    h.links.buildRequestUser.mockResolvedValue(null);
    await expect(h.service.handleDecision(link, pending, 'approve')).resolves.toBe(
      TASK_REPLIES.accountInactive,
    );
  });

  it('execution failure marks the task FAILED and replies with the reason', async () => {
    const h = buildHarness();
    h.executor.execute.mockResolvedValue({ ok: false, error: 'Supplier blocked' });
    await expect(h.service.handleDecision(link, pending, 'approve')).resolves.toBe(
      TASK_REPLIES.failed(421, 'Supplier blocked'),
    );
    expect(h.tasks.fail).toHaveBeenCalledWith('t1', 'Supplier blocked');
    expect(h.tasks.complete).not.toHaveBeenCalled();
  });

  it('reject cancels the pending task', async () => {
    const h = buildHarness();
    await expect(h.service.handleDecision(link, pending, 'cancel')).resolves.toBe(
      TASK_REPLIES.cancelled(421),
    );
    expect(h.tasks.cancel).toHaveBeenCalledWith('t1', 'Rejected by user');
  });
});
