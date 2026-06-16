import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

/**
 * Live notification feed backed by the `/notifications` API (per-user inbox).
 *
 * This is distinct from `use-notifications.ts`, which manages the notification
 * *rule configuration*. This hook drives the header bell and the Notifications
 * page: the actual messages a user receives.
 */

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type FeedNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: NotificationPriority;
  module: string;
  referenceType?: string | null;
  referenceId?: string | null;
  deepLink?: string | null;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
};

export type NotificationFeed = {
  data: FeedNotification[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
  hasMore: boolean;
};

const keys = {
  all: ['notification-feed'] as const,
  list: (page: number, limit: number) => [...keys.all, 'list', page, limit] as const,
  unread: () => [...keys.all, 'unread-count'] as const,
};

function unwrap<T>(payload: unknown): T {
  const env = payload as { data?: T };
  return (env?.data ?? payload) as T;
}

export function useNotificationFeed(params?: { page?: number; limit?: number }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  return useQuery({
    queryKey: keys.list(page, limit),
    queryFn: async (): Promise<NotificationFeed> => {
      const res = await api.get('/notifications', { params: { page, limit } });
      // The list endpoint returns the envelope at the top level.
      const body = (res.data?.data ?? res.data) as NotificationFeed;
      return {
        data: Array.isArray(body?.data) ? body.data : [],
        total: body?.total ?? 0,
        page: body?.page ?? page,
        limit: body?.limit ?? limit,
        unreadCount: body?.unreadCount ?? 0,
        hasMore: body?.hasMore ?? false,
      };
    },
  });
}

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: keys.unread(),
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<number> => {
      const res = await api.get('/notifications/unread/count');
      const body = unwrap<{ count: number }>(res.data);
      return body?.count ?? 0;
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}
