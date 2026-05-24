import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { SubscriptionSnapshot } from '@/lib/plans';

export function useSubscription(enabled = true) {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    enabled,
    queryFn: async () => {
      const res = await api.get('/billing/subscription');
      return (res.data?.data ?? res.data) as SubscriptionSnapshot;
    },
    staleTime: 5 * 60 * 1000,
  });
}
