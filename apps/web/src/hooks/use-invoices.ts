import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { fetchAllCursorPages } from '@/lib/fetch-cursor-pages';

export type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  totalValue: string | number;
  paidValue?: string | number;
  dueDate?: string | null;
  remarks?: string | null;
  customer?: { customerName: string };
  salesOrder?: { soNumber: string };
};

export type CreateInvoicePayload = {
  invoiceNumber?: string;
  invoiceDate?: string;
  salesOrderId?: string;
  customerId: string;
  shopId?: string;
  totalValue: number;
  dueDate?: string;
  remarks?: string;
};

const keys = {
  all: ['invoices'] as const,
  list: () => [...keys.all, 'list'] as const,
};

export function useInvoices() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: async () => {
      // Newest 100; the API caps a page at 100.
      return fetchAllCursorPages<Invoice>('/invoices', { take: 100 });
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateInvoicePayload) => {
      const res = await api.post('/invoices', payload);
      return res.data.data as Invoice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

