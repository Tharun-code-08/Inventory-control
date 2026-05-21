import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type AlertEvent = {
  id: string;
  alertType: 'LOW_STOCK' | 'CONTRACT_EXPIRY' | 'RFQ_DEADLINE' | 'PO_OVERDUE';
  severity: string;
  title: string;
  message: string;
  isRead: boolean;
  triggeredAt: string;
};

const keys = {
  all: ['alerts'] as const,
  list: () => [...keys.all, 'list'] as const,
};

export function useAlerts() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: async () => {
      const res = await api.get('/alerts');
      return (res.data.data ?? []) as AlertEvent[];
    },
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useRunAlertChecks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/alerts/run-checks');
      return res.data.data as { generated: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/alerts/${id}/read`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

