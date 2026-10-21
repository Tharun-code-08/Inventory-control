import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE, QUERY_STALE_TIME } from '@/lib/constants';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME.lists,
      gcTime: CACHE.GC_TIME,
      retry: 1,
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ims-query-cache',
});

/** Drops every cached query, in memory and on disk, so the next user starts clean. */
export async function clearQueryCache(): Promise<void> {
  queryClient.clear();
  try {
    await asyncStoragePersister.removeClient();
  } catch {
    // Storage failures must not block sign-out.
  }
}
