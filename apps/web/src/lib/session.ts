import { api, applyAccessToken, extractAuthPayload } from '@/api/client';
import { normalizeProduct } from '@/hooks/use-products';
import { useAuthStore } from '@/store/authStore';

async function fetchSessionProducts(shopId: string | null) {
  const items: ReturnType<typeof normalizeProduct>[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '500');
    if (shopId) {
      params.set('shop_id', shopId);
    }

    const response = await api.get(`/products?${params.toString()}`);
    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    items.push(...rows.map(normalizeProduct));
    totalPages =
      typeof response.data?.meta?.totalPages === 'number'
        ? response.data.meta.totalPages
        : 1;
    page += 1;
  } while (page <= totalPages);

  return items;
}

export async function initializeSessionFromAuthResponse(payload: unknown) {
  const authPayload = extractAuthPayload(payload);
  if (!authPayload) {
    throw new Error('Unexpected response from server');
  }

  applyAccessToken(authPayload.accessToken);
  useAuthStore.getState().setSession(authPayload.accessToken, authPayload.user);

  let currentUser = authPayload.user;

  try {
    const meResponse = await api.get('/auth/me');
    currentUser = meResponse.data.data as typeof currentUser;
    useAuthStore.getState().setUser(currentUser);
  } catch {
    useAuthStore.getState().setUser(currentUser);
  }

  try {
    const products = await fetchSessionProducts(currentUser.shopId);
    useAuthStore.getState().setProducts(products);
  } catch {
    useAuthStore.getState().setProducts([]);
  }

  return currentUser;
}
