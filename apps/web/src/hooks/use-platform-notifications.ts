import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { isPlatformAdminUser } from '@/lib/roles';
import { useAuthStore } from '@/store/authStore';

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

function usePlatformQueriesEnabled() {
  const user = useAuthStore((s) => s.user);
  return isPlatformAdminUser(user);
}

export function usePlatformNotifications(opts?: { unreadOnly?: boolean }) {
  const enabled = usePlatformQueriesEnabled();
  return useQuery({
    queryKey: keys.list(opts),
    queryFn: async () => {
      const params = opts?.unreadOnly ? '?unreadOnly=true' : '';
      const res = await api.get(`/platform/notifications${params}`);
      return (res.data?.data ?? res.data ?? []) as PlatformNotification[];
    },
    retry: false,
    enabled,
    refetchInterval: enabled ? 30_000 : false,
  });
}

export function usePlatformUnreadCount() {
  const enabled = usePlatformQueriesEnabled();
  return useQuery({
    queryKey: keys.unread(),
    queryFn: async () => {
      const res = await api.get('/platform/notifications/unread-count');
      const payload = res.data?.data ?? res.data;
      return Number(payload?.count ?? 0);
    },
    retry: false,
    enabled,
    refetchInterval: enabled ? 30_000 : false,
  });
}

export function usePlatformHealth() {
  const enabled = usePlatformQueriesEnabled();
  return useQuery({
    queryKey: keys.health(),
    queryFn: async () => {
      const res = await api.get('/platform/health');
      return (res.data?.data ?? res.data) as PlatformHealthSnapshot;
    },
    retry: false,
    enabled,
    refetchInterval: enabled ? 60_000 : false,
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
