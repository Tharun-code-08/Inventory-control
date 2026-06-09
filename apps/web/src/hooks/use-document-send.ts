import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { DocumentPdfKind } from '@/lib/document-pdf';

const SEND_PATH_BY_KIND: Partial<Record<DocumentPdfKind, string>> = {
  'purchase-order': '/purchase-orders',
  invoice: '/invoices',
  payment: '/payments',
  'sales-order': '/sales-orders',
  'supplier-bill': '/supplier-bills',
  'supplier-payment': '/supplier-payments',
  'goods-receipt': '/goods-receipts',
  'sales-quotation': '/sales-quotations',
  'goods-return': '/returns/supplier',
};

export function useSendDocumentEmail(kind: DocumentPdfKind) {
  const qc = useQueryClient();
  const basePath = SEND_PATH_BY_KIND[kind];

  return useMutation({
    mutationFn: async ({ id, resend }: { id: string; resend?: boolean }) => {
      if (!basePath) {
        throw new Error(`Send not supported for document kind: ${kind}`);
      }
      const res = await api.post(`${basePath}/${id}/send${resend ? '?resend=true' : ''}`);
      return res.data.data ?? res.data;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['document-email-history', kind, id] });
      if (kind === 'purchase-order') {
        qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      } else if (kind === 'sales-order') {
        qc.invalidateQueries({ queryKey: ['sales-orders'] });
      } else if (kind === 'invoice') {
        qc.invalidateQueries({ queryKey: ['invoices'] });
      } else if (kind === 'payment') {
        qc.invalidateQueries({ queryKey: ['payments'] });
      } else if (kind === 'supplier-bill') {
        qc.invalidateQueries({ queryKey: ['supplier-bills'] });
      } else if (kind === 'supplier-payment') {
        qc.invalidateQueries({ queryKey: ['supplier-payments'] });
      } else if (kind === 'goods-receipt') {
        qc.invalidateQueries({ queryKey: ['goods-receipts'] });
      } else if (kind === 'sales-quotation') {
        qc.invalidateQueries({ queryKey: ['sales-quotations'] });
      } else if (kind === 'goods-return') {
        qc.invalidateQueries({ queryKey: ['returns'] });
      }
    },
  });
}
