import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type EmailSenderStatus = 'PENDING' | 'VERIFIED' | 'FAILED';

export type EmailSenderRow = {
  id: string;
  displayName: string;
  email: string;
  senderType: 'CUSTOM_DOMAIN' | 'PUBLIC_DOMAIN';
  isPrimary: boolean;
  status: EmailSenderStatus;
  verifiedAt: string | null;
  domainId: string | null;
  smtpConfigured?: boolean;
  smtpLastVerifiedAt?: string | null;
  smtpRequired?: boolean;
  isPublicDomain?: boolean;
};

export type EmailSenderDomainRow = {
  id: string;
  domain: string;
  status: EmailSenderStatus;
  verifiedAt: string | null;
  dkimHost: string;
  dkimValue: string;
  senders: EmailSenderRow[];
};

export type EmailSendersResponse = {
  platform: {
    configured: boolean;
    from: string;
    replyTo: string;
    bcc: string;
    guidance: string;
  };
  companyName: string;
  customDomains: EmailSenderDomainRow[];
  publicSenders: EmailSenderRow[];
  primarySenderId: string | null;
};

const keys = {
  all: ['email-senders'] as const,
};

export function useEmailSenders() {
  return useQuery({
    queryKey: keys.all,
    queryFn: async () => {
      const res = await api.get('/settings/email-notifications/senders');
      return (res.data?.data ?? res.data) as EmailSendersResponse;
    },
  });
}

export function useCreateEmailSender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { displayName: string; email: string }) => {
      const res = await api.post('/settings/email-notifications/senders', payload);
      return (res.data?.data ?? res.data) as EmailSenderRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateEmailSender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; displayName?: string; isPrimary?: boolean }) => {
      const res = await api.patch(`/settings/email-notifications/senders/${payload.id}`, payload);
      return (res.data?.data ?? res.data) as EmailSenderRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useDeleteEmailSender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/settings/email-notifications/senders/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useValidateEmailDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (domain: string) => {
      const res = await api.post(
        `/settings/email-notifications/senders/domains/${encodeURIComponent(domain)}/validate`,
      );
      return res.data?.data ?? res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useFetchDomainDkim() {
  return useMutation({
    mutationFn: async (domain: string) => {
      const res = await api.get(
        `/settings/email-notifications/senders/domains/${encodeURIComponent(domain)}/dkim`,
      );
      return res.data?.data ?? res.data;
    },
  });
}

export function useSendSenderVerification() {
  return useMutation({
    mutationFn: async (senderId: string) => {
      const res = await api.post(`/settings/email-notifications/senders/${senderId}/send-verification`);
      return res.data?.data ?? res.data;
    },
  });
}

export function useVerifySenderOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { senderId: string; otpCode: string }) => {
      const res = await api.post(`/settings/email-notifications/senders/${payload.senderId}/verify-otp`, {
        otpCode: payload.otpCode,
      });
      return (res.data?.data ?? res.data) as EmailSenderRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export type ConfigureSenderSmtpPayload = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
};

export function useConfigureSenderSmtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { senderId: string } & ConfigureSenderSmtpPayload) => {
      const { senderId, ...body } = payload;
      const res = await api.put(`/settings/email-notifications/senders/${senderId}/smtp`, body);
      return (res.data?.data ?? res.data) as EmailSenderRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useTestSenderSmtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { senderId: string } & ConfigureSenderSmtpPayload) => {
      const { senderId, ...body } = payload;
      const res = await api.post(`/settings/email-notifications/senders/${senderId}/smtp/test`, body);
      return res.data?.data ?? res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
