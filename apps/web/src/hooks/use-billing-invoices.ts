import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export type SubscriptionInvoiceRow = {
  id: string;
  invoiceNumber: string;
  plan: string;
  billingCycle: string;
  totalPaise: number;
  currency: string;
  issuedAt: string;
};

async function fetchInvoices(): Promise<SubscriptionInvoiceRow[]> {
  const res = await api.get('/billing/invoices');
  return res.data?.data ?? res.data ?? [];
}

export function useSubscriptionInvoices() {
  return useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: fetchInvoices,
  });
}

export async function downloadSubscriptionInvoicePdf(invoiceId: string) {
  const res = await api.get(`/billing/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
  return res.data as Blob;
}
