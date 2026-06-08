import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { fetchAllCursorPages } from '@/lib/fetch-cursor-pages';

export type Customer = {
  id: string;
  customerCode: string;
  customerName: string;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  pan?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  shopId?: string;
  isActive: boolean;
};

type CustomerListMeta = {
  nextCursor?: string | null;
  hasMore?: boolean;
};

const keys = {
  all: ['customers'] as const,
  list: (search?: string) => [...keys.all, 'list', search ?? ''] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
  search: (search?: string) => [...keys.all, 'search', search ?? ''] as const,
};

export function useCustomers(search?: string, options?: { fetchAll?: boolean }) {
  const infinite = useInfiniteQuery({
    queryKey: keys.list(search),
    queryFn: async ({ pageParam }) => {
      const res = await api.get('/customers', {
        params: {
          search: search || undefined,
          take: 100,
          cursor: pageParam || undefined,
        },
      });
      return {
        data: (res.data.data ?? []) as Customer[],
        meta: (res.data.meta ?? {}) as CustomerListMeta,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta?.nextCursor ?? undefined,
    enabled: options?.fetchAll !== true,
  });

  const allPages = useQuery({
    queryKey: [...keys.list(search), 'all-pages'],
    queryFn: () =>
      fetchAllCursorPages<Customer>('/customers', {
        search: search || undefined,
        take: 100,
      }),
    enabled: options?.fetchAll === true,
  });

  if (options?.fetchAll) {
    return {
      data: allPages.data ?? [],
      meta: { hasMore: false, nextCursor: null },
      isLoading: allPages.isLoading,
      isFetching: allPages.isFetching,
      fetchNextPage: async () => undefined,
      hasNextPage: false,
      isFetchingNextPage: false,
    };
  }

  const flat = infinite.data?.pages.flatMap((p) => p.data) ?? [];
  const lastMeta = infinite.data?.pages[infinite.data.pages.length - 1]?.meta;

  return {
    data: flat,
    meta: lastMeta ?? { hasMore: false, nextCursor: null },
    isLoading: infinite.isLoading,
    isFetching: infinite.isFetching,
    fetchNextPage: infinite.fetchNextPage,
    hasNextPage: infinite.hasNextPage,
    isFetchingNextPage: infinite.isFetchingNextPage,
  };
}

/** Debounced server search for comboboxes (single page, fast). */
export function useCustomerSearch(search?: string) {
  return useQuery({
    queryKey: keys.search(search),
    queryFn: async () => {
      const res = await api.get('/customers', {
        params: { search: search?.trim() || undefined, take: 50 },
      });
      return (res.data.data ?? []) as Customer[];
    },
    staleTime: 30_000,
  });
}

export function useCustomer(id: string, enabled = true) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/customers/${id}`);
      return (res.data.data ?? res.data) as Customer;
    },
    enabled: enabled && !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Customer> & { shopId?: string }) => {
      const res = await api.post('/customers', payload);
      return res.data.data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<Customer> & { shopId?: string };
    }) => {
      const res = await api.patch(`/customers/${id}`, payload);
      return res.data.data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
