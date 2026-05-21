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

    expect(payload).toEqual({
      shopId: 'shop-1',
      poDate: '2026-05-02',
      supplier: 'Acme Supplies',
      contractId: undefined,
      remarks: 'urgent',
      items: [{ productId: 'prod-1', orderQty: 5, rate: 120 }],
    });
  });
});
