import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type NotificationSeverity = 'URGENT' | 'WARNING' | 'ACTION' | 'INFO';
export type NotificationChannel = 'Email' | 'SMS' | 'In-app' | 'WhatsApp';

export type NotificationRule = {
  id: string;
  title: string;
  notifyTo: string;
  severity: NotificationSeverity;
  channels: NotificationChannel[];
};

export type NotificationGroup = {
  id: string;
  title: string;
  moduleTags: string[];
  rules: NotificationRule[];
};

export type NotificationConfig = {
  version?: string;
  groups: NotificationGroup[];
};

const keys = {
  all: ['notification-config'] as const,
};

function normalizeConfig(payload: unknown): NotificationConfig {
  const source = payload as NotificationConfig;
  return {
    version: source?.version ?? '1.0',
    groups: Array.isArray(source?.groups) ? source.groups : [],
  };
}

export function useNotificationConfig() {
  return useQuery({
    queryKey: keys.all,
    queryFn: async () => {
      const res = await api.get('/alerts/notification-config');
      return normalizeConfig(res.data.data ?? res.data);
    },
  });
}

export function useUpdateNotificationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NotificationConfig) => {
      const res = await api.put('/alerts/notification-config', payload);
      return normalizeConfig(res.data.data ?? res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}
