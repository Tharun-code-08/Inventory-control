import { NotificationSchedulerService } from './notification-scheduler.service';

function buildHarness(notificationsEnabled = false, existing: Array<{ key: string }> = []) {
  const queue = {
    add: jest.fn().mockResolvedValue({}),
    upsertJobScheduler: jest.fn().mockResolvedValue({}),
    getJobSchedulers: jest.fn().mockResolvedValue(existing),
    removeJobScheduler: jest.fn().mockResolvedValue(true),
  };
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
  it('removes existing schedules on bootstrap when AGENT_NOTIFICATIONS_ENABLED is not set', async () => {
    const h = buildHarness(false, [{ key: 'daily_summary-c1' }]);
    await h.service.onApplicationBootstrap();
    expect(h.queue.upsertJobScheduler).not.toHaveBeenCalled();
    expect(h.queue.removeJobScheduler).toHaveBeenCalledWith('daily_summary-c1');
  });

  it('upserts 3 schedulers per company in the business timezone when enabled', async () => {
    const h = buildHarness(true);
    await h.service.onApplicationBootstrap();
    // 2 companies × 3 job types
    expect(h.queue.upsertJobScheduler).toHaveBeenCalledTimes(6);
    const names = h.queue.upsertJobScheduler.mock.calls.map((c: unknown[]) => (c[2] as { name: string }).name);
    expect(names).toEqual(expect.arrayContaining(['daily_summary', 'low_stock_alert', 'overdue_payment']));
    expect(h.queue.upsertJobScheduler.mock.calls[0][1]).toEqual(expect.objectContaining({ tz: 'Asia/Kolkata' }));
  });

  it('removes legacy repeatables that are not a current scheduler', async () => {
    const h = buildHarness(true, [{ key: 'repeat:legacy-cron-key' }, { key: 'daily_summary-c1' }]);
    await h.service.onApplicationBootstrap();
    expect(h.queue.removeJobScheduler).toHaveBeenCalledWith('repeat:legacy-cron-key');
    expect(h.queue.removeJobScheduler).not.toHaveBeenCalledWith('daily_summary-c1');
  });

  it('scheduleForCompany registers 3 schedulers when enabled', async () => {
    const h = buildHarness(true);
    await h.service.scheduleForCompany('c-new');
    const ids = h.queue.upsertJobScheduler.mock.calls.map((c: unknown[]) => c[0]);
    expect(ids).toEqual(['daily_summary-c-new', 'low_stock_alert-c-new', 'overdue_payment-c-new']);
  });

  it('scheduleForCompany is a no-op when notifications are disabled', async () => {
    const h = buildHarness(false);
    await h.service.scheduleForCompany('c-new');
    expect(h.queue.upsertJobScheduler).not.toHaveBeenCalled();
  });
});
