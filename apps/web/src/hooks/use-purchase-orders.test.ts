import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/client';
import { fetchAllPurchaseOrders, PO_LIST_MAX_LIMIT } from './use-purchase-orders';

vi.mock('@/api/client', () => ({ api: { get: vi.fn() } }));

const get = vi.mocked(api.get);

function pageResponse(ids: string[], hasMore: boolean) {
  return { data: { data: ids.map((id) => ({ id })), meta: { hasMore } } };
}

describe('fetchAllPurchaseOrders', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('pages within the API limit until there are no more rows', async () => {
    get
      .mockResolvedValueOnce(pageResponse(['a', 'b'], true))
      .mockResolvedValueOnce(pageResponse(['c'], false));

    const rows = await fetchAllPurchaseOrders({ shopId: 'shop-1' });

    expect(rows.map((po) => po.id)).toEqual(['a', 'b', 'c']);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenNthCalledWith(1, `/purchase-orders?page=1&limit=${PO_LIST_MAX_LIMIT}&shop_id=shop-1`);
    expect(get).toHaveBeenNthCalledWith(2, `/purchase-orders?page=2&limit=${PO_LIST_MAX_LIMIT}&shop_id=shop-1`);
  });

  it('stops after the page cap even if the API reports more', async () => {
    get.mockResolvedValue(pageResponse(['x'], true));

    const rows = await fetchAllPurchaseOrders();

    expect(get).toHaveBeenCalledTimes(10);
    expect(rows).toHaveLength(10);
  });
});
