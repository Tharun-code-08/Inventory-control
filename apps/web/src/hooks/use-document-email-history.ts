import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { DocumentPdfKind } from '@/lib/document-pdf';

export type DocumentEmailHistoryRow = {
  id: string;
  entityType: string;
  entityId: string;
  documentNumber: string;
  templateId: string;
  recipient: string;
  attachmentFilename: string | null;
  status: string;
  trigger: string;
  attempts: number;
  retryCount: number;
  lastError: string | null;
  nextRetryAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type DocumentEmailSummary = {
  emailStatus: string;
  lastRecipient: string | null;
  lastSentAt: string | null;
  lastAttachment: string | null;
  retryCount: number;
  lastError: string | null;
};

type EmailHistoryResponse = {
  data: {
    history: DocumentEmailHistoryRow[];
    summary: DocumentEmailSummary | null;
  };
};

export function useDocumentEmailHistory(kind: DocumentPdfKind, id: string | null | undefined) {
  return useQuery({
    queryKey: ['document-email-history', kind, id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<EmailHistoryResponse>(`/documents/${kind}/${id}/email-history`);
      return res.data.data;
    },
  });
}
