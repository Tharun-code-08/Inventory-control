import { CustomerDispatchService } from './customer-dispatch.service';
import type { DispatchJobData } from './dispatch-job';

function makeService(invoice: { status: string; totalValue: number; paidValue: number } | null) {
  const prisma = {
    invoiceHeader: { findUnique: jest.fn().mockResolvedValue(invoice) },
    customerContactChannel: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const timeline = { record: jest.fn() };
  const service = new CustomerDispatchService(
    prisma as never, {} as never, {} as never, {} as never, {} as never,
    timeline as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never,
  );
  const internals = service as unknown as {
    dispatch: jest.Mock;
    loadConsent: jest.Mock;
  };
  internals.dispatch = jest.fn();
  internals.loadConsent = jest.fn().mockResolvedValue({ whatsapp: true, email: false, addresses: {} });
  return { service, internals };
}

const job: DispatchJobData = {
  eventId: 'e1',
  correlationId: 'c1',
  companyId: 'co1',
  customerId: 'cu1',
  invoiceId: 'inv1',
  invoiceNumber: 'INV-1',
  tone: 'FRIENDLY',
  balanceDue: 1000,
  priority: 'NORMAL',
  channels: ['WHATSAPP', 'EMAIL'],
};

describe('CustomerDispatchService queued sends', () => {
  it('skips a deferred send when the invoice was paid in the meantime', async () => {
    const { service, internals } = makeService({ status: 'PAID', totalValue: 1000, paidValue: 1000 });
    await service.sendDeferred(job);
    expect(internals.dispatch).not.toHaveBeenCalled();
  });

  it('sends a deferred reminder with the live balance on consented channels only', async () => {
    const { service, internals } = makeService({ status: 'PARTIALLY_PAID', totalValue: 1000, paidValue: 400 });
    await service.sendDeferred(job);
    expect(internals.dispatch).toHaveBeenCalledTimes(1);
    const [, payload, channels] = internals.dispatch.mock.calls[0];
    expect(payload.balanceDue).toBe(600);
    expect(channels).toEqual(['WHATSAPP']);
  });

  it('drops a queued send when consent was withdrawn for every channel', async () => {
    const { service, internals } = makeService({ status: 'ISSUED', totalValue: 1000, paidValue: 0 });
    internals.loadConsent.mockResolvedValue({ whatsapp: false, email: false, addresses: {} });
    await service.sendDeferred(job);
    expect(internals.dispatch).not.toHaveBeenCalled();
  });

  it('sends no digest when every batched invoice is settled', async () => {
    const { service, internals } = makeService({ status: 'VOID', totalValue: 1000, paidValue: 0 });
    await service.sendDigest('co1', 'cu1', [
      { invoiceId: 'inv1', invoiceNumber: 'INV-1', balanceDue: 1000, tone: 'FRIENDLY', eventId: 'e1', correlationId: 'c1' },
    ]);
    expect(internals.dispatch).not.toHaveBeenCalled();
  });
});
