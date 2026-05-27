import { DocumentSeriesRestart } from '@prisma/client';
import { DocumentSeriesService } from './document-series.service';

describe('DocumentSeriesService', () => {
  const service = new DocumentSeriesService({} as never);

  it('builds monthly preview for shop-scoped modules', () => {
    const preview = service.buildPreview(
      {
        docType: 'PO',
        moduleLabel: 'Purchase Order',
        prefix: 'PO',
        startingNumber: 2,
        padWidth: 5,
        restartPeriod: DocumentSeriesRestart.MONTHLY,
        shopScoped: true,
        enabled: true,
        useCategoryPrefix: false,
        isOverride: false,
      },
      'HQ001',
      new Date('2026-05-15T00:00:00.000Z'),
    );
    expect(preview).toBe('PO-HQ001-202605-00002');
  });

  it('builds flat preview when restart is none', () => {
    const preview = service.buildPreview(
      {
        docType: 'PRD',
        moduleLabel: 'Products',
        prefix: 'PRD',
        startingNumber: 1,
        padWidth: 5,
        restartPeriod: DocumentSeriesRestart.NONE,
        shopScoped: false,
        enabled: true,
        useCategoryPrefix: true,
        isOverride: false,
      },
      'HQ001',
      new Date('2026-05-15T00:00:00.000Z'),
    );
    expect(preview).toBe('PRD-00001');
  });

  it('uses yearly and flat buckets', () => {
    const date = new Date('2026-05-15T00:00:00.000Z');
    expect(service.sequenceBucket(date, DocumentSeriesRestart.MONTHLY)).toBe('202605');
    expect(service.sequenceBucket(date, DocumentSeriesRestart.YEARLY)).toBe('2026');
    expect(service.sequenceBucket(date, DocumentSeriesRestart.NONE)).toBe('000000');
  });

  it('merges shop override over company default', async () => {
    const prisma = {
      documentSeriesConfig: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.shopId === null) {
            return Promise.resolve({
              prefix: 'PO',
              startingNumber: 1,
              padWidth: 5,
              restartPeriod: DocumentSeriesRestart.MONTHLY,
              shopScoped: true,
              enabled: true,
              useCategoryPrefix: false,
            });
          }
          if (where.shopId === 'shop-1') {
            return Promise.resolve({
              prefix: 'PUR',
              startingNumber: 10,
              padWidth: 5,
              restartPeriod: DocumentSeriesRestart.MONTHLY,
              shopScoped: true,
              enabled: true,
              useCategoryPrefix: false,
            });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn(),
      },
    };
    const scoped = new DocumentSeriesService(prisma as never);
    const resolved = await scoped.resolveEffectiveConfigInTx(
      prisma as never,
      'company-1',
      'shop-1',
      'PO',
    );
    expect(resolved.prefix).toBe('PUR');
    expect(resolved.startingNumber).toBe(10);
    expect(resolved.isOverride).toBe(true);
  });
});
