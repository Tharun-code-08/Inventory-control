import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type EmailTemplateConfig = {
  enabled: boolean;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  cc?: string[];
  bcc?: string[];
};

export type EmailTemplateDefinition = {
  id: string;
  label: string;
  group: string;
  description: string;
  placeholders: string[];
  defaultSubject: string;
  defaultBodyText: string;
  defaultBodyHtml: string;
};

export type EmailNotificationsConfig = {
  version: '1.0';
  templates: Record<string, EmailTemplateConfig>;
  reminders: {
    paymentReminderEnabled: boolean;
    paymentReminderDaysBefore: number[];
  };
  internalAlerts: {
    lowStock: { emailEnabled: boolean; recipients: string[] };
    rfqDeadline: { emailEnabled: boolean; recipients: string[] };
    invoiceOverdue: { emailEnabled: boolean; recipients: string[] };
    goodsReceiptPosted: { emailEnabled: boolean; recipients: string[] };
  };
  isOverride?: boolean;
};

export type EmailNotificationsResponse = {
  config: EmailNotificationsConfig;
  definitions: EmailTemplateDefinition[];
  sender: {
    configured: boolean;
    from: string;
    replyTo: string;
    bcc: string;
    domainAuthenticated: boolean | null;
    guidance: string;
  };
};

const keys = {
  all: ['email-notifications'] as const,
  detail: (shopId?: string) => [...keys.all, shopId ?? 'company'] as const,
};

export function useEmailNotifications(shopId?: string) {
  return useQuery({
    queryKey: keys.detail(shopId),
    queryFn: async () => {
      const params = shopId ? `?shopId=${encodeURIComponent(shopId)}` : '';
      const res = await api.get(`/settings/email-notifications${params}`);
      return (res.data?.data ?? res.data) as EmailNotificationsResponse;
    },
  });
}

export type EmailNotificationsSavePayload = Pick<
  EmailNotificationsConfig,
  'version' | 'templates' | 'reminders' | 'internalAlerts'
>;

export function toEmailNotificationsSavePayload(
  config: EmailNotificationsConfig,
): EmailNotificationsSavePayload {
  return {
    version: config.version,
    templates: config.templates,
    reminders: config.reminders,
    internalAlerts: config.internalAlerts,
  };
}

export function useUpdateEmailNotifications(shopId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EmailNotificationsConfig | EmailNotificationsSavePayload) => {
      const body = 'isOverride' in payload ? toEmailNotificationsSavePayload(payload) : payload;
      const res = shopId
        ? await api.put(`/settings/email-notifications/shops/${shopId}`, body)
        : await api.put('/settings/email-notifications', body);
      return (res.data?.data ?? res.data) as EmailNotificationsResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function usePreviewEmailTemplate() {
  return useMutation({
    mutationFn: async (payload: {
      templateId: string;
      template?: EmailTemplateConfig;
      sampleContext?: Record<string, string>;
    }) => {
      const res = await api.post('/settings/email-notifications/preview', payload);
      return (res.data?.data ?? res.data) as { subject: string; text: string; html: string };
    },
  });
}
