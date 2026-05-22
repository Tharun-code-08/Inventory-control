import type { SalesOrder } from '@/hooks/use-sales-orders';

export type ParsedOrderRemarks = {
  paymentTerms: string;
  deliveryAddress: string;
  notes: string;
};

export function parseOrderRemarks(remarks?: string | null): ParsedOrderRemarks {
  const raw = remarks ?? '';
  let paymentTerms = 'Net 30';
  let deliveryAddress = '';
  let notes = raw;

  const payMatch = raw.match(/Payment terms:\s*(.+)/i);
  const delMatch = raw.match(/Delivery:\s*(.+)/i);
  if (payMatch) paymentTerms = payMatch[1].split('\n')[0].trim();
  if (delMatch) deliveryAddress = delMatch[1].split('\n')[0].trim();
  if (payMatch || delMatch) {
    notes = raw
      .replace(/Payment terms:\s*.+/i, '')
      .replace(/Delivery:\s*.+/i, '')
      .trim();
  }

  return { paymentTerms, deliveryAddress, notes };
}

export function formatOrderDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatOrderAmount(value?: string | number | null): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

/** USD formatting for sales-order PDF (matches reference layout). */
export function formatPdfMoney(value?: string | number | null): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);
}

export function statusLabel(status: string): string {
  if (status === 'DRAFT') return 'Draft';
  if (status === 'CONFIRMED') return 'Confirmed';
  if (status === 'FULFILLED') return 'Fulfilled';
  if (status === 'CLOSED') return 'Closed';
  if (status === 'CANCELLED') return 'Cancelled';
  return status;
}

export function orderGrandTotal(order: SalesOrder): number {
  if (order.totalValue != null) return Number(order.totalValue);
  return (order.items ?? []).reduce((sum, line) => sum + Number(line.lineValue ?? 0), 0);
}
