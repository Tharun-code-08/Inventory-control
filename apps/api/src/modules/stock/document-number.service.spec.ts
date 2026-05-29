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
        findUnique: jest.fn().mockResolvedValue(null),
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
        findUnique: jest.fn().mockResolvedValue({ lastSeq: 20 }),
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
});
