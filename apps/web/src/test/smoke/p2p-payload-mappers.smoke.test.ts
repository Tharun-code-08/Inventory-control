import { describe, expect, it } from 'vitest';
import { mapPoFormToCreatePayload } from '@/lib/payload-mappers';

describe('P2P payload smoke', () => {
  it('maps PO form values to API-safe payload', () => {
    const payload = mapPoFormToCreatePayload({
      values: {
        poDate: '2026-05-02',
        supplier: 'Acme Supplies',
        remarks: 'urgent',
        items: [{ productId: 'prod-1', orderQty: 5, rate: 120 }],
      },
      resolvedShopId: 'shop-1',
      sourceType: 'DIRECT',
    });

    expect(payload.shopId).toBe('shop-1');
    expect(payload.poDate).toBe('2026-05-02');
    expect(payload.supplier).toBe('Acme Supplies');
    expect(payload.contractId).toBeUndefined();
    expect(payload.remarks).toContain('urgent');
    expect(payload.remarks).toContain('PO_DOCUMENT');
    expect(payload.items).toEqual([{ productId: 'prod-1', orderQty: 5, rate: 120 }]);
  });
});
