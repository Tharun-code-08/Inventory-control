import type { Quotation, QuotationItem } from '@/hooks/use-quotations';
import type { Rfq } from '@/hooks/use-rfqs';

export type BidScoreRow = {
  quoteId: string;
  supplierId: string;
  supplierName: string;
  email: string | null;
  totalPrice: number;
  leadTimeDays: number;
  priceScore: number;
  leadTimeScore: number;
  weightedScore: number;
  rank: number;
};

export type RfqAllocationMap = Record<string, Record<string, number>>;

const ALLOCATION_STORAGE_PREFIX = 'retail-ims:rfq-allocations:';

export function parseLeadTimeDays(notes?: string | null): number | null {
  if (!notes) return null;
  const match = notes.match(/Lead time:\s*(\d+)\s*days/i);
  return match ? Number(match[1]) : null;
}

export function quoteTotalPrice(items: QuotationItem[] | undefined): number {
  if (!items?.length) return 0;
  return items.reduce((sum, it) => sum + Number(it.lineValue ?? 0), 0);
}

export function activeQuotations(quotations: Quotation[]): Quotation[] {
  return quotations.filter(
    (q) => q.status === 'POSTED' && (q.items?.length ?? 0) > 0,
  );
}

function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Relative scores: best price and fastest lead time each score 100. */
export function computeBidScores(
  quotations: Quotation[],
  priceWeightPercent: number,
): BidScoreRow[] {
  const quotes = activeQuotations(quotations);
  if (quotes.length === 0) return [];

  const priceWeight = Math.min(100, Math.max(0, priceWeightPercent)) / 100;
  const leadWeight = 1 - priceWeight;

  const rows = quotes.map((q) => {
    const totalPrice = quoteTotalPrice(q.items);
    const parsedLead = parseLeadTimeDays(q.notes);
    return {
      quoteId: q.id,
      supplierId: q.supplier?.id ?? '',
      supplierName: q.supplier?.supplierName ?? 'Unknown',
      email: q.supplier?.email ?? null,
      totalPrice,
      leadTimeDays: parsedLead ?? 0,
      hasLeadTime: parsedLead != null,
    };
  });

  const prices = rows.map((r) => r.totalPrice).filter((p) => p > 0);
  const leads = rows.filter((r) => r.hasLeadTime).map((r) => r.leadTimeDays);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const minLead = leads.length ? Math.min(...leads) : 0;
  const maxLead = leads.length ? Math.max(...leads) : 0;

  const scored = rows.map((row) => {
    let priceScore = 100;
    if (row.totalPrice > 0 && maxPrice > minPrice) {
      priceScore = ((maxPrice - row.totalPrice) / (maxPrice - minPrice)) * 100;
    } else if (row.totalPrice > 0 && minPrice > 0) {
      priceScore = (minPrice / row.totalPrice) * 100;
    }

    let leadTimeScore = 50;
    if (row.hasLeadTime) {
      if (maxLead > minLead) {
        leadTimeScore = ((maxLead - row.leadTimeDays) / (maxLead - minLead)) * 100;
      } else {
        leadTimeScore = 100;
      }
    } else if (leads.length === 0) {
      leadTimeScore = 100;
    }

    const weightedScore =
      priceWeight * priceScore + leadWeight * leadTimeScore;

    return {
      quoteId: row.quoteId,
      supplierId: row.supplierId,
      supplierName: row.supplierName,
      email: row.email,
      totalPrice: row.totalPrice,
      leadTimeDays: row.hasLeadTime ? row.leadTimeDays : 0,
      priceScore: roundScore(priceScore),
      leadTimeScore: roundScore(leadTimeScore),
      weightedScore: roundScore(weightedScore),
      rank: 0,
    };
  });

  scored.sort((a, b) => b.weightedScore - a.weightedScore);
  return scored.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function getQuoteLineForRfqItem(
  quote: Quotation,
  rfqItemId: string,
  itemIndex: number,
): QuotationItem | undefined {
  const items = quote.items ?? [];
  const linked = items.find(
    (it) => it.rfqItemId === rfqItemId || (it as { rfqItem?: { id?: string } }).rfqItem?.id === rfqItemId,
  );
  if (linked) return linked;
  return items[itemIndex];
}

export function unitPriceForLine(line: QuotationItem | undefined): number {
  if (!line) return 0;
  return Number(line.unitPrice ?? 0);
}

export function loadAllocations(rfqId: string): RfqAllocationMap {
  try {
    const raw = localStorage.getItem(`${ALLOCATION_STORAGE_PREFIX}${rfqId}`);
    if (!raw) return {};
    return JSON.parse(raw) as RfqAllocationMap;
  } catch {
    return {};
  }
}

export function saveAllocations(rfqId: string, map: RfqAllocationMap): void {
  localStorage.setItem(`${ALLOCATION_STORAGE_PREFIX}${rfqId}`, JSON.stringify(map));
}

export function validateAllocations(
  rfq: Rfq,
  allocations: RfqAllocationMap,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const item of rfq.items ?? []) {
    const required = Number(item.quantity);
    const perQuote = allocations[item.id] ?? {};
    const allocated = Object.values(perQuote).reduce((s, n) => s + (Number(n) || 0), 0);
    if (allocated > required) {
      const label = item.product?.productCode ?? item.description ?? item.id;
      errors.push(`${label}: allocated ${allocated} exceeds required ${required}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function totalAllocatedForItem(
  allocations: RfqAllocationMap,
  rfqItemId: string,
): number {
  const perQuote = allocations[rfqItemId] ?? {};
  return Object.values(perQuote).reduce((s, n) => s + (Number(n) || 0), 0);
}

export function allocatedCostByQuote(
  rfq: Rfq,
  quotes: Quotation[],
  allocations: RfqAllocationMap,
): Record<string, number> {
  const costs: Record<string, number> = {};
  for (const quote of quotes) {
    costs[quote.id] = 0;
  }
  (rfq.items ?? []).forEach((rfqItem, index) => {
    for (const quote of quotes) {
      const qty = allocations[rfqItem.id]?.[quote.id] ?? 0;
      if (qty <= 0) continue;
      const line = getQuoteLineForRfqItem(quote, rfqItem.id, index);
      costs[quote.id] += qty * unitPriceForLine(line);
    }
  });
  return costs;
}
