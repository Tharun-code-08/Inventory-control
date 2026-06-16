import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';

export type AlertEvent = {
  id: string;
  alertType: string;
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
      const data = unwrapData<AlertEvent[]>(res.data);
      return Array.isArray(data) ? data : [];
    },
    staleTime: 20_000,
  });
}

export function useRunAlertChecks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/alerts/run-checks');
      return unwrapData<{ generated: number }>(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/alerts/${id}/read`);
      return unwrapData(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
