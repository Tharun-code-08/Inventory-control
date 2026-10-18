import { contentHash, dayBucket, DedupStore } from './dedup-store';

function storeWith(setImpl: jest.Mock) {
  return new DedupStore({ set: setImpl } as never);
}

describe('dedup-store', () => {
  it('contentHash is stable and dayBucket is the UTC date', () => {
    const parts = { companyId: 'co', customerId: 'c', invoiceId: 'i', tone: 'firm', bucket: '2026-01-05' };
    expect(contentHash(parts)).toBe(contentHash(parts));
    expect(dayBucket(new Date('2026-01-05T23:59:00Z'))).toBe('2026-01-05');
  });

  it('markIfNew returns true when Redis claims the key (SET NX = OK)', async () => {
    const set = jest.fn().mockResolvedValue('OK');
    const isNew = await storeWith(set).markIfNew('h');
    expect(isNew).toBe(true);
    expect(set).toHaveBeenCalledWith('wf:dedup:h', '1', 'PX', expect.any(Number), 'NX');
  });

  it('markIfNew returns false when the key already exists (SET NX = null)', async () => {
    const isNew = await storeWith(jest.fn().mockResolvedValue(null)).markIfNew('h');
    expect(isNew).toBe(false);
  });

  it('fails open (true) when Redis errors, so delivery is never blocked', async () => {
    const isNew = await storeWith(jest.fn().mockRejectedValue(new Error('conn refused'))).markIfNew('h');
    expect(isNew).toBe(true);
  });
});
