import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type PlatformNotification = {
  id: string;
  category: 'REVENUE' | 'HEALTH' | 'SYSTEM';
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  notificationKey: string;
  title: string;
  message: string;
  actionUrl: string | null;
  companyId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
};

export type PlatformHealthSnapshot = {
  timestamp: string;
  database: { sizeBytes: number; limitBytes: number; usagePct: number };
  disk: Array<{ path: string; freePct: number; freeBytes: number }>;
  queues: Record<string, { waiting: number; active: number; failed: number; delayed: number }>;
  cpuLoadPct: number;
  memoryUsagePct: number;
  httpErrorsDelta5m: number;
};

const keys = {
  all: ['platform', 'notifications'] as const,
  list: (opts?: { unreadOnly?: boolean }) => [...keys.all, 'list', opts ?? {}] as const,
  unread: () => [...keys.all, 'unread-count'] as const,
  health: () => ['platform', 'health'] as const,
};

export function usePlatformNotifications(opts?: { unreadOnly?: boolean }) {
  return useQuery({
    queryKey: keys.list(opts),
    queryFn: async () => {
      const params = opts?.unreadOnly ? '?unreadOnly=true' : '';
      const res = await api.get(`/platform/notifications${params}`);
      return (res.data?.data ?? res.data ?? []) as PlatformNotification[];
    },
    retry: false,
    refetchInterval: 30_000,
  });
}

export function usePlatformUnreadCount() {
  return useQuery({
    queryKey: keys.unread(),
    queryFn: async () => {
      const res = await api.get('/platform/notifications/unread-count');
      const payload = res.data?.data ?? res.data;
      return Number(payload?.count ?? 0);
    },
    retry: false,
    refetchInterval: 30_000,
  });
}

export function usePlatformHealth() {
  return useQuery({
    queryKey: keys.health(),
    queryFn: async () => {
      const res = await api.get('/platform/health');
      return (res.data?.data ?? res.data) as PlatformHealthSnapshot;
    },
    retry: false,
    refetchInterval: 60_000,
  });
}

export function useMarkPlatformNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/platform/notifications/${id}/read`);
      return res.data?.data ?? res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useMarkAllPlatformNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/platform/notifications/read-all');
      return res.data?.data ?? res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
