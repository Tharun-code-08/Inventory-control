import type { QueryClient } from '@tanstack/react-query';

const TENANT_LOCAL_PREFIX = 'ims.productCategories';

export function resetClientSessionState(queryClient?: QueryClient) {
  if (queryClient) {
    queryClient.clear();
  }

  if (typeof window === 'undefined') return;

  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key === TENANT_LOCAL_PREFIX || key.startsWith(`${TENANT_LOCAL_PREFIX}.`)) {
      localStorage.removeItem(key);
    }
  }
}
