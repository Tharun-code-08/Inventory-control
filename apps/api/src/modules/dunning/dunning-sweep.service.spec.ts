import { DunningCandidate } from '@/common/workflow-engine/dunning-sweep';
import { DunningSweepService } from './dunning-sweep.service';

const DAY = 86_400_000;
const NOW = new Date('2026-07-30T00:00:00.000Z');

const dueCandidate = (over: Partial<DunningCandidate> = {}): DunningCandidate => ({
  invoiceId: 'inv-1',
  invoiceNumber: 'INV-1',
  companyId: 'co-1',
  customerId: 'cust-1',
  dueDate: new Date(NOW.getTime() + 3 * DAY), // T-3 friendly step is due
  balanceDue: 1000,
  invoiceStatus: 'ISSUED',
  customerReplied: false,
  consent: { whatsapp: true, email: true },
  thread: null,
  ...over,
});

const buildHarness = (candidates: DunningCandidate[]) => {
  const tx = { __tx: true };
  const prisma = { $transaction: jest.fn(async (fn: (t: unknown) => unknown) => fn(tx)) };
  const repo = {
    loadCandidates: jest.fn().mockResolvedValue(candidates),
    saveThreadOps: jest.fn().mockResolvedValue(undefined),
  };
  const outbox = { emit: jest.fn().mockResolvedValue('evt-1') };
  // Default: every tenant on the ladder model (graph-execution off), so all
  // candidates flow through the pure planner exactly as before.
  const features = { isEnabled: jest.fn().mockResolvedValue(false) };
  const graph = { sweep: jest.fn().mockResolvedValue({ companiesEnabled: 0, threadsAdvanced: 0, stepsEmitted: 0, resolved: 0 }) };
  const service = new DunningSweepService(
    prisma as never,
    repo as never,
    outbox as never,
    features as never,
    graph as never,
  );
  return { service, prisma, repo, outbox, features, graph, tx };
};

describe('DunningSweepService.sweep', () => {
  it('persists thread ops and emits an invoice.dunning-step per send, in one tx', async () => {
    const { service, repo, outbox, tx } = buildHarness([dueCandidate()]);

    const result = await service.sweep(NOW);

    expect(repo.saveThreadOps).toHaveBeenCalledTimes(1);
    expect(repo.saveThreadOps.mock.calls[0][0]).toBe(tx); // inside the tx
    expect(outbox.emit).toHaveBeenCalledTimes(1);
    expect(outbox.emit.mock.calls[0][0]).toBe(tx);
    expect(outbox.emit.mock.calls[0][1]).toMatchObject({
      eventType: 'invoice.dunning-step',
      aggregateId: 'inv-1',
      companyId: 'co-1',
      payload: { stepIndex: 0, channels: ['WHATSAPP', 'EMAIL'] },
    });
    expect(result).toMatchObject({ candidates: 1, emitted: 1, threadOps: 1 });
  });

  it('emits nothing for a paid invoice but still resolves its thread', async () => {
    const { service, repo, outbox } = buildHarness([
      dueCandidate({ invoiceStatus: 'PAID', balanceDue: 0 }),
    ]);

    const result = await service.sweep(NOW);

    expect(outbox.emit).not.toHaveBeenCalled();
    expect(repo.saveThreadOps).toHaveBeenCalledTimes(1); // RESOLVED op still saved
    expect(result).toMatchObject({ emitted: 0, threadOps: 1 });
  });

  it('counts blocked (no consent) candidates without emitting', async () => {
    const { service, outbox } = buildHarness([
      dueCandidate({ consent: { whatsapp: false, email: false } }),
    ]);

    const result = await service.sweep(NOW);

    expect(outbox.emit).not.toHaveBeenCalled();
    expect(result).toMatchObject({ emitted: 0, blocked: 1 });
  });

  it('routes graph-execution tenants to the graph executor and skips them in the ladder', async () => {
    const { service, outbox, features, graph } = buildHarness([dueCandidate()]);
    features.isEnabled.mockResolvedValue(true); // this tenant is on the graph model
    graph.sweep.mockResolvedValue({ companiesEnabled: 1, threadsAdvanced: 1, stepsEmitted: 1, resolved: 0 });

    const result = await service.sweep(NOW);

    // Ladder emitted nothing (the sole candidate was on the graph model)...
    expect(outbox.emit).not.toHaveBeenCalled();
    expect(result.emitted).toBe(0);
    // ...and the graph executor ran and its advance count is surfaced.
    expect(graph.sweep).toHaveBeenCalledWith(NOW);
    expect(result.graphAdvanced).toBe(1);
  });
});
