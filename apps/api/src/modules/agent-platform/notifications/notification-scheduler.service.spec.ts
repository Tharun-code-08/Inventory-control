import { NotificationSchedulerService } from './notification-scheduler.service';

function buildHarness(notificationsEnabled = false) {
  const queue = { add: jest.fn().mockResolvedValue({}) };
  const prisma = { company: { findMany: jest.fn().mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]) } };
  const config = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'AGENT_NOTIFICATIONS_ENABLED') return notificationsEnabled ? 'true' : undefined;
      return undefined;
    }),
  };
  const service = new NotificationSchedulerService(prisma as never, config as never, queue as never);
  return { queue, prisma, config, service };
}

describe('NotificationSchedulerService', () => {
  it('does nothing on bootstrap when AGENT_NOTIFICATIONS_ENABLED is not set', async () => {
    const h = buildHarness(false);
    await h.service.onApplicationBootstrap();
    expect(h.queue.add).not.toHaveBeenCalled();
  });

  it('registers 3 repeatable jobs per company when enabled', async () => {
    const h = buildHarness(true);
    await h.service.onApplicationBootstrap();
    // 2 companies × 3 job types = 6 queue.add calls
    expect(h.queue.add).toHaveBeenCalledTimes(6);
    const jobNames = h.queue.add.mock.calls.map((c: unknown[]) => c[0]);
    expect(jobNames).toEqual(
      expect.arrayContaining(['daily_summary', 'low_stock_alert', 'overdue_payment']),
    );
  });

  it('scheduleForCompany registers 3 jobs when enabled', async () => {
    const h = buildHarness(true);
    await h.service.scheduleForCompany('c-new');
    expect(h.queue.add).toHaveBeenCalledTimes(3);
    const ids = h.queue.add.mock.calls.map((c: unknown[]) => (c[2] as { jobId?: string }).jobId);
    expect(ids).toContain('daily_summary:c-new');
    expect(ids).toContain('low_stock_alert:c-new');
    expect(ids).toContain('overdue_payment:c-new');
  });

  it('scheduleForCompany is a no-op when notifications are disabled', async () => {
    const h = buildHarness(false);
    await h.service.scheduleForCompany('c-new');
    expect(h.queue.add).not.toHaveBeenCalled();
  });
});
