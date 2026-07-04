import { AgentTaskStepStatus, type AgentTask, type AgentTaskStep } from '@prisma/client';
import type { RequestUser } from '@/common/types/request-user';
import { TaskExecutorService, type TaskStepRunner } from './task-executor.service';

const user = { id: 'u1', permissions: [] } as unknown as RequestUser;

function step(overrides: Partial<AgentTaskStep>): AgentTaskStep {
  return {
    id: 's1',
    taskId: 't1',
    order: 1,
    name: 'purchase.create_po',
    status: AgentTaskStepStatus.PENDING,
    attempts: 0,
    result: null,
    error: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as AgentTaskStep;
}

function task(steps: AgentTaskStep[]): AgentTask & { steps: AgentTaskStep[] } {
  return {
    id: 't1',
    payload: { supplier: 'Acme' },
    steps,
  } as unknown as AgentTask & { steps: AgentTaskStep[] };
}

function buildHarness() {
  const prisma = { agentTaskStep: { update: jest.fn().mockResolvedValue({}) } };
  const service = new TaskExecutorService(prisma as never);
  return { service, prisma };
}

function runner(overrides: Partial<TaskStepRunner> = {}): TaskStepRunner {
  return {
    name: 'purchase.create_po',
    run: jest.fn().mockResolvedValue({ id: 'po1', poNumber: 'PO-1' }),
    verify: jest.fn(),
    describe: jest.fn().mockReturnValue('✅ done'),
    ...overrides,
  };
}

describe('TaskExecutorService', () => {
  it('rejects duplicate runner registration', () => {
    const { service } = buildHarness();
    service.registerRunner(runner());
    expect(() => service.registerRunner(runner())).toThrow(/already registered/);
  });

  it('executes pending steps in order and returns the describe() reply', async () => {
    const { service } = buildHarness();
    const calls: string[] = [];
    service.registerRunner(
      runner({
        name: 'a',
        run: jest.fn(async () => {
          calls.push('a');
          return { ok: 1 };
        }),
        describe: () => 'reply-a',
      }),
    );
    service.registerRunner(
      runner({
        name: 'b',
        run: jest.fn(async () => {
          calls.push('b');
          return { ok: 2 };
        }),
        describe: () => 'reply-b',
      }),
    );

    const outcome = await service.execute(
      user,
      task([step({ id: 's2', order: 2, name: 'b' }), step({ id: 's1', order: 1, name: 'a' })]),
    );

    expect(calls).toEqual(['a', 'b']);
    expect(outcome).toEqual({ ok: true, reply: 'reply-b', result: { ok: 2 } });
  });

  it('skips steps already COMPLETED (safe re-execution)', async () => {
    const { service } = buildHarness();
    const run = jest.fn().mockResolvedValue({ id: 'x' });
    service.registerRunner(runner({ name: 'a', run }));
    service.registerRunner(runner({ name: 'b', run: jest.fn().mockResolvedValue({}) }));

    await service.execute(
      user,
      task([
        step({ id: 's1', order: 1, name: 'a', status: AgentTaskStepStatus.COMPLETED }),
        step({ id: 's2', order: 2, name: 'b' }),
      ]),
    );
    expect(run).not.toHaveBeenCalled();
  });

  it('passes the task payload and step to the runner (idempotency key inputs)', async () => {
    const { service } = buildHarness();
    const run = jest.fn().mockResolvedValue({ id: 'po1' });
    service.registerRunner(runner({ run }));

    const t = task([step({})]);
    await service.execute(user, t);
    expect(run).toHaveBeenCalledWith(user, { supplier: 'Acme' }, t, t.steps[0]);
  });

  it('fails the outcome when the verifier rejects the result', async () => {
    const { service, prisma } = buildHarness();
    service.registerRunner(
      runner({
        verify: () => {
          throw new Error('bad shape');
        },
      }),
    );

    const outcome = await service.execute(user, task([step({})]));
    expect(outcome).toEqual({ ok: false, error: 'bad shape' });
    expect(prisma.agentTaskStep.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: AgentTaskStepStatus.FAILED, error: 'bad shape' }),
      }),
    );
  });

  it('stops at the first failing step and reports the error', async () => {
    const { service } = buildHarness();
    service.registerRunner(runner({ name: 'a', run: jest.fn().mockRejectedValue(new Error('db down')) }));
    const runB = jest.fn();
    service.registerRunner(runner({ name: 'b', run: runB }));

    const outcome = await service.execute(
      user,
      task([step({ id: 's1', order: 1, name: 'a' }), step({ id: 's2', order: 2, name: 'b' })]),
    );
    expect(outcome).toEqual({ ok: false, error: 'db down' });
    expect(runB).not.toHaveBeenCalled();
  });

  it('fails cleanly when no runner is registered for a step', async () => {
    const { service } = buildHarness();
    const outcome = await service.execute(user, task([step({ name: 'ghost.step' })]));
    expect(outcome).toEqual({ ok: false, error: 'No runner registered for step "ghost.step"' });
  });
});
