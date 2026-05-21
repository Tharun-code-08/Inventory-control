import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FxRateService } from './fx-rate.service';

function makePrisma(rows: Array<{ base: string; quote: string; rate: string; asOf: Date }>) {
  return {
    fxRate: {
      findFirst: jest.fn(async ({ where, orderBy }: any) => {
        const matches = rows
          .filter(
            (r) =>
              r.base === where.base &&
              r.quote === where.quote &&
              r.asOf.getTime() <= where.asOf.lte.getTime(),
          )
          .sort((a, b) =>
            orderBy?.asOf === 'desc'
              ? b.asOf.getTime() - a.asOf.getTime()
              : a.asOf.getTime() - b.asOf.getTime(),
          );
        return matches[0] ?? null;
      }),
    },
  } as unknown;
}

describe('FxRateService', () => {
  it('returns 1 for same currency', async () => {
    const svc = new FxRateService(makePrisma([]) as any);
    const rate = await svc.getRate('USD', 'USD');
    expect(rate.toString()).toBe('1');
  });

  it('returns the most recent direct rate at-or-before asOf', async () => {
    const rows = [
      { base: 'USD', quote: 'EUR', rate: '0.90', asOf: new Date('2026-01-01T00:00:00Z') },
      { base: 'USD', quote: 'EUR', rate: '0.95', asOf: new Date('2026-03-01T00:00:00Z') },
      { base: 'USD', quote: 'EUR', rate: '0.99', asOf: new Date('2027-01-01T00:00:00Z') },
    ];
    const svc = new FxRateService(makePrisma(rows) as any);
    const rate = await svc.getRate('USD', 'EUR', new Date('2026-06-01T00:00:00Z'));
    expect(rate.toFixed(2)).toBe('0.95');
  });

  it('inverts when only the reciprocal rate is stored', async () => {
    const rows = [
      { base: 'EUR', quote: 'USD', rate: '1.10', asOf: new Date('2026-01-01T00:00:00Z') },
    ];
    const svc = new FxRateService(makePrisma(rows) as any);
    const rate = await svc.getRate('USD', 'EUR', new Date('2026-06-01T00:00:00Z'));
    expect(rate.toFixed(6)).toBe(new Prisma.Decimal(1).div('1.10').toFixed(6));
  });

  it('throws NotFoundException when no rate exists', async () => {
    const svc = new FxRateService(makePrisma([]) as any);
    await expect(svc.getRate('USD', 'JPY')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('snapshot stability: rate fetched at asOf is unaffected by later FX changes', async () => {
    const rows = [
      { base: 'USD', quote: 'EUR', rate: '0.90', asOf: new Date('2026-01-01T00:00:00Z') },
    ];
    const svc = new FxRateService(makePrisma(rows) as any);
    const earlySnap = await svc.getRate('USD', 'EUR', new Date('2026-02-01T00:00:00Z'));

    // simulate a later rate row arriving after the document was issued
    rows.push({
      base: 'USD',
      quote: 'EUR',
      rate: '0.50',
      asOf: new Date('2027-01-01T00:00:00Z'),
    });
    const stillEarly = await svc.getRate('USD', 'EUR', new Date('2026-02-01T00:00:00Z'));
    expect(stillEarly.toString()).toBe(earlySnap.toString());
  });
});
