import { DocumentSeriesRestart } from '@prisma/client';
import { DocumentNumberService } from './document-number.service';

describe('DocumentNumberService', () => {
  it('starts from configured starting number for a new bucket', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      shop: {
        findUnique: jest.fn().mockResolvedValue({
          shopNumber: 'HQ001',
          companyId: 'company-1',
        }),
      },
      documentSequence: {
        aggregate: jest.fn().mockResolvedValue({ _max: { lastSeq: null } }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const series = {
      resolveEffectiveConfigInTx: jest.fn().mockResolvedValue({
        prefix: 'PO',
        startingNumber: 12,
        padWidth: 5,
        restartPeriod: DocumentSeriesRestart.NONE,
        shopScoped: false,
      }),
      sequenceBucket: jest.fn().mockReturnValue('000000'),
      sanitizePrefix: jest.fn((value: string) => value),
      shopScopedPrefix: jest.fn(() => 'PO-HQ001'),
    };

    const service = new DocumentNumberService({} as never, series as never);
    const number = await service.nextConfiguredShopScopedNumber(tx as never, {
      shopId: 'shop-1',
      docType: 'PO',
      date: new Date('2026-05-15T00:00:00.000Z'),
    });

    expect(number).toBe('PO-00012');
    expect(tx.documentSequence.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ lastSeq: 12 }),
        update: expect.objectContaining({ lastSeq: 12 }),
      }),
    );
  });

  it('increments existing sequence above starting number', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      shop: {
        findUnique: jest.fn().mockResolvedValue({
          shopNumber: 'HQ001',
          companyId: 'company-1',
        }),
      },
      documentSequence: {
        aggregate: jest.fn().mockResolvedValue({ _max: { lastSeq: 20 } }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const series = {
      resolveEffectiveConfigInTx: jest.fn().mockResolvedValue({
        prefix: 'CRT',
        startingNumber: 1,
        padWidth: 5,
        restartPeriod: DocumentSeriesRestart.NONE,
        shopScoped: false,
      }),
      sequenceBucket: jest.fn().mockReturnValue('000000'),
      sanitizePrefix: jest.fn((value: string) => value),
      shopScopedPrefix: jest.fn((shop: string, prefix: string) => `${prefix}-${shop}`),
    };

    const service = new DocumentNumberService({} as never, series as never);
    const number = await service.nextConfiguredNumber(tx as never, {
      shopId: 'shop-1',
      docType: 'CRT',
      date: new Date('2026-05-15T00:00:00.000Z'),
    });

    expect(number).toBe('CRT-00021');
  });

  it('counts a flat series per organisation, so a second plant continues the sequence', async () => {
    const rows = new Map<string, number>([['shop-1', 7]]);
    const tx = {
      $executeRaw: jest.fn(),
      shop: {
        findUnique: jest.fn().mockResolvedValue({ shopNumber: 'B002', companyId: 'company-1' }),
      },
      documentSequence: {
        aggregate: jest.fn(async (args: any) => {
          expect(args.where).toEqual({ docType: 'SO', yearMonth: '000000', shop: { companyId: 'company-1' } });
          return { _max: { lastSeq: Math.max(...rows.values()) } };
        }),
        upsert: jest.fn(async (args: any) => {
          rows.set(args.create.shopId, args.create.lastSeq);
        }),
      },
    };
    const series = {
      resolveEffectiveConfigInTx: jest.fn().mockResolvedValue({
        prefix: 'SO',
        startingNumber: 1,
        padWidth: 5,
        restartPeriod: DocumentSeriesRestart.NONE,
        shopScoped: false,
      }),
      sequenceBucket: jest.fn().mockReturnValue('000000'),
      sanitizePrefix: jest.fn((value: string) => value),
      shopScopedPrefix: jest.fn(),
    };
    const service = new DocumentNumberService({} as never, series as never);

    const number = await service.nextConfiguredShopScopedNumber(tx as never, {
      shopId: 'shop-2',
      docType: 'SO',
      date: new Date(),
    });

    expect(number).toBe('SO-00008');
    expect(rows.get('shop-2')).toBe(8);
    expect(tx.$executeRaw.mock.calls[0][1]).toBe('SO:company:company-1:000000');
  });

  it('counts a plant-scoped series per plant', async () => {
    const tx = {
      $executeRaw: jest.fn(),
      shop: { findUnique: jest.fn().mockResolvedValue({ shopNumber: 'B002', companyId: 'company-1' }) },
      documentSequence: {
        findUnique: jest.fn().mockResolvedValue({ lastSeq: 3 }),
        aggregate: jest.fn(),
        upsert: jest.fn(),
      },
    };
    const series = {
      resolveEffectiveConfigInTx: jest.fn().mockResolvedValue({
        prefix: 'ST',
        startingNumber: 1,
        padWidth: 5,
        restartPeriod: DocumentSeriesRestart.NONE,
        shopScoped: true,
      }),
      sequenceBucket: jest.fn().mockReturnValue('000000'),
      sanitizePrefix: jest.fn((value: string) => value),
      shopScopedPrefix: jest.fn((shop: string, prefix: string) => `${prefix}-${shop}`),
    };
    const service = new DocumentNumberService({} as never, series as never);

    await expect(
      service.nextConfiguredShopScopedNumber(tx as never, { shopId: 'shop-2', docType: 'ST', date: new Date() }),
    ).resolves.toBe('ST-B002-00004');
    expect(tx.documentSequence.aggregate).not.toHaveBeenCalled();
  });
});
