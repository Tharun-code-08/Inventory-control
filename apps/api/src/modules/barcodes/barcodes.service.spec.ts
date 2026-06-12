import { ScanAction, ScanSource } from '@prisma/client';
import { BarcodesService } from './barcodes.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { CompanySettingsService } from '../company-settings/company-settings.service';

const COMPANY_A = '11111111-1111-1111-1111-111111111111';
const COMPANY_B = '22222222-2222-2222-2222-222222222222';

function makeUser(companyId: string, id: string): RequestUser {
  return {
    id,
    email: 'u@example.com',
    role: 'COMPANY_ADMIN' as RequestUser['role'],
    shopId: null,
    companyId,
    tenantShopIds: [],
    permissions: [],
  };
}

type BarcodeRow = {
  id: string;
  companyId: string;
  barcodeType: string;
  product: { id: string; productCode: string };
};

function makePrismaMock(barcodesByCompany: Record<string, BarcodeRow | undefined>) {
  return {
    productBarcode: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(barcodesByCompany[where.companyId_barcode.companyId] ?? null),
      ),
      update: jest.fn(() => Promise.resolve({})),
    },
    product: {
      findFirst: jest.fn(() => Promise.resolve(null)),
    },
    scanLog: {
      create: jest.fn(() => Promise.resolve({})),
    },
  };
}

describe('BarcodesService.lookup', () => {
  const productA = { id: 'prod-a', productCode: 'PRD-A' };
  const productB = { id: 'prod-b', productCode: 'PRD-B' };

  function setup() {
    const prisma = makePrismaMock({
      [COMPANY_A]: { id: 'bc-a', companyId: COMPANY_A, barcodeType: 'EAN13', product: productA },
      [COMPANY_B]: { id: 'bc-b', companyId: COMPANY_B, barcodeType: 'EAN13', product: productB },
    });
    const companySettings = {
      getUnknownBarcodePolicy: jest.fn(() => Promise.resolve('ASK')),
    } as unknown as CompanySettingsService;
    return {
      prisma,
      companySettings,
      service: new BarcodesService(prisma as unknown as PrismaService, companySettings),
    };
  }

  it('resolves the same barcode to different products per company (no tenant leakage)', async () => {
    const { service } = setup();
    const a = await service.lookup(makeUser(COMPANY_A, 'user-a'), '8901234567890');
    const b = await service.lookup(makeUser(COMPANY_B, 'user-b'), '8901234567890');
    expect(a.found && a.product.id).toBe('prod-a');
    expect(b.found && b.product.id).toBe('prod-b');
  });

  it('normalizes whitespace before lookup', async () => {
    const { prisma, service } = setup();
    const result = await service.lookup(makeUser(COMPANY_A, 'user-a'), '  8901234567890 ');
    expect(result.found).toBe(true);
    expect(prisma.productBarcode.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId_barcode: { companyId: COMPANY_A, barcode: '8901234567890' } },
      }),
    );
  });

  it('flags double-fired scans within the debounce window and skips log/counters', async () => {
    const { prisma, service } = setup();
    const user = makeUser(COMPANY_A, 'user-a');
    const first = await service.lookup(user, '8901234567890');
    const second = await service.lookup(user, '8901234567890');
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(prisma.scanLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.productBarcode.update).toHaveBeenCalledTimes(0);
  });

  it('does not debounce different users scanning the same code', async () => {
    const { prisma, service } = setup();
    await service.lookup(makeUser(COMPANY_A, 'user-1'), '8901234567890');
    const other = await service.lookup(makeUser(COMPANY_A, 'user-2'), '8901234567890');
    expect(other.duplicate).toBe(false);
    expect(prisma.scanLog.create).toHaveBeenCalledTimes(2);
  });

  it('debounce expires after the window so deliberate rescans count', async () => {
    const { prisma, service } = setup();
    const user = makeUser(COMPANY_A, 'user-a');
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);
    await service.lookup(user, '8901234567890');
    nowSpy.mockReturnValue(1_600); // beyond the 400ms window
    const again = await service.lookup(user, '8901234567890');
    nowSpy.mockRestore();
    expect(again.duplicate).toBe(false);
    expect(prisma.scanLog.create).toHaveBeenCalledTimes(2);
  });

  it('logs unknown barcodes as NOT_FOUND with source and returns recovery payload', async () => {
    const prisma = makePrismaMock({});
    const companySettings = {
      getUnknownBarcodePolicy: jest.fn(() => Promise.resolve('ASK')),
    } as unknown as CompanySettingsService;
    const service = new BarcodesService(prisma as unknown as PrismaService, companySettings);
    const result = await service.lookup(
      makeUser(COMPANY_A, 'user-a'),
      'UNKNOWN-1',
      ScanAction.GOODS_RECEIPT,
      undefined,
      ScanSource.WEB,
    );
    expect(result).toMatchObject({ found: false, barcode: 'UNKNOWN-1', duplicate: false });
    expect(prisma.scanLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        result: 'NOT_FOUND',
        action: ScanAction.GOODS_RECEIPT,
        source: ScanSource.WEB,
        barcode: 'UNKNOWN-1',
      }),
    });
  });

  it('rejects empty scans and logs them as INVALID', async () => {
    const prisma = makePrismaMock({});
    const companySettings = {
      getUnknownBarcodePolicy: jest.fn(() => Promise.resolve('ASK')),
    } as unknown as CompanySettingsService;
    const service = new BarcodesService(prisma as unknown as PrismaService, companySettings);
    await expect(service.lookup(makeUser(COMPANY_A, 'user-a'), '   ')).rejects.toThrow(
      'Scanned barcode is empty or invalid',
    );
    expect(prisma.scanLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: 'INVALID' }),
    });
  });
});
