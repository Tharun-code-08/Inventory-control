import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type Payment = {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  amount: string | number;
  method?: string | null;
  reference?: string | null;
  remarks?: string | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalValue?: string | number;
    paidValue?: string | number;
    dueDate?: string | null;
    status?: string;
  };
};

export type CreatePaymentPayload = {
  receiptNumber?: string;
  receiptDate?: string;
  invoiceId: string;
  amount: number;
  method?: string;
  reference?: string;
  remarks?: string;
  idempotencyKey?: string;
};

const keys = {
  all: ['payments'] as const,
  list: () => [...keys.all, 'list'] as const,
};

export function usePayments() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: async () => {
      // Newest 100; the API caps a page at 100.
      const res = await api.get('/payments', { params: { take: 100 } });
      return (res.data.data ?? []) as Payment[];
    },
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePaymentPayload) => {
      const res = await api.post('/payments', payload);
      return res.data.data as Payment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

