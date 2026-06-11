import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addScannedItem,
  calculateVariance,
  createSession,
  fetchSessions,
  getSessionDetails,
  postAdjustment,
  type CountLineItem,
} from '@/api/stockCount';

export const stockCountKeys = {
  all: ['stock-count'] as const,
  sessions: () => [...stockCountKeys.all, 'sessions'] as const,
  items: (sessionId: string) => [...stockCountKeys.all, 'items', sessionId] as const,
  variance: (sessionId: string) => [...stockCountKeys.all, 'variance', sessionId] as const,
};

export function useStockCountSessions() {
  return useQuery({
    queryKey: stockCountKeys.sessions(),
    queryFn: fetchSessions,
  });
}

export function useCreateStockCountSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockCountKeys.sessions() });
    },
  });
}

export function useStockCountItems(sessionId: string) {
  return useQuery({
    queryKey: stockCountKeys.items(sessionId),
    queryFn: () => getSessionDetails(sessionId),
    enabled: !!sessionId,
  });
}

export function useAddScannedItem(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ barcode, qty }: { barcode: string; qty?: number }) =>
      addScannedItem(sessionId, barcode, qty),
    onSuccess: (item: CountLineItem) => {
      queryClient.setQueryData<CountLineItem[]>(stockCountKeys.items(sessionId), (prev) => {
        const rest = (prev ?? []).filter((it) => it.barcode !== item.barcode);
        return [...rest, item];
      });
    },
  });
}

export function useStockCountVariance(sessionId: string) {
  return useQuery({
    queryKey: stockCountKeys.variance(sessionId),
    queryFn: () => calculateVariance(sessionId),
    enabled: !!sessionId,
  });
}

export function usePostAdjustment(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postAdjustment(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockCountKeys.all });
    },
  });
}
