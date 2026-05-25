import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Save,
  ShoppingCart,
  Star,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useRfq } from '@/hooks/use-rfqs';
import { useQuotations, useAcceptAutoLinkQuotation } from '@/hooks/use-quotations';
import { useContracts } from '@/hooks/use-contracts';
import {
  activeQuotations,
  allocatedCostByQuote,
  computeBidScores,
  getQuoteLineForRfqItem,
  loadAllocations,
  parseLeadTimeDays,
  saveAllocations,
  totalAllocatedForItem,
  unitPriceForLine,
  validateAllocations,
  type RfqAllocationMap,
} from '@/lib/bid-comparison';
import { cn } from '@/lib/cn';

function formatMoney(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

type SummaryCardProps = {
  title: string;
  value: string;
  sub: string;
  accent: string;
  icon: ReactNode;
};

function SummaryCard({ title, value, sub, accent, icon }: SummaryCardProps) {
  return (
    <Card className="overflow-hidden border-slate-200/90 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('w-1 self-stretch rounded-full', accent)} aria-hidden />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="truncate text-lg font-semibold text-slate-900">{value}</p>
          <p className="truncate text-xs text-slate-500">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function RfqComparePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: rfq, isLoading, isError } = useRfq(id);
  const { data: quotations = [] } = useQuotations(id);
  const { data: contracts = [] } = useContracts();
  const acceptQuote = useAcceptAutoLinkQuotation();

  const [priceWeight, setPriceWeight] = useState(60);
  const [allocations, setAllocations] = useState<RfqAllocationMap>({});
  const [pickedQuoteId, setPickedQuoteId] = useState<string | null>(null);

  const bids = useMemo(() => activeQuotations(quotations), [quotations]);
  const scores = useMemo(() => computeBidScores(quotations, priceWeight), [quotations, priceWeight]);
  const leadWeight = 100 - priceWeight;

  const awardedQuoteIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of contracts) {
      if (c.quotationId && (!c.rfqId || c.rfqId === id)) set.add(c.quotationId);
    }
    return set;
  }, [contracts, id]);

  useEffect(() => {
    if (!id) return;
    setAllocations(loadAllocations(id));
  }, [id]);

  useEffect(() => {
    if (pickedQuoteId) return;
    const awarded = bids.find((b) => awardedQuoteIds.has(b.id));
    if (awarded) {
      setPickedQuoteId(awarded.id);
      return;
    }
    if (scores[0]) setPickedQuoteId(scores[0].quoteId);
  }, [bids, scores, awardedQuoteIds, pickedQuoteId]);

  const summary = useMemo(() => {
    if (!scores.length) return null;
    const top = scores[0];
    const lowest = [...scores].sort((a, b) => a.totalPrice - b.totalPrice)[0];
    const fastest = [...scores]
      .filter((s) => s.leadTimeDays > 0)
      .sort((a, b) => a.leadTimeDays - b.leadTimeDays)[0];
    return {
      top,
      lowest,
      fastest,
      totalBids: bids.length,
      activeBids: bids.filter((b) => b.status === 'POSTED').length,
    };
  }, [scores, bids]);

  const allocatedCosts = useMemo(() => {
    if (!rfq) return {};
    return allocatedCostByQuote(rfq, bids, allocations);
  }, [rfq, bids, allocations]);

  const selectedQuote = useMemo(
    () => bids.find((quote) => quote.id === pickedQuoteId) ?? null,
    [bids, pickedQuoteId],
  );

  const selectedQuotePoItems = useMemo(() => {
    if (!rfq || !selectedQuote) return [];
    return (rfq.items ?? []).flatMap((rfqItem, index) => {
      const orderQty = allocations[rfqItem.id]?.[selectedQuote.id] ?? 0;
      if (orderQty <= 0) return [];
      const line = getQuoteLineForRfqItem(selectedQuote, rfqItem.id, index);
      if (!line?.id) return [];
      return [
        {
          quotationItemId: line.id,
          rfqItemId: line.rfqItemId ?? rfqItem.id,
          orderQty,
        },
      ];
    });
  }, [allocations, rfq, selectedQuote]);

  const grandAllocatedQty = useMemo(() => {
    if (!rfq) return { allocated: 0, required: 0 };
    let allocated = 0;
    let required = 0;
    for (const item of rfq.items ?? []) {
      required += Number(item.quantity);
      allocated += totalAllocatedForItem(allocations, item.id);
    }
    return { allocated, required };
  }, [rfq, allocations]);

  function setAllocation(rfqItemId: string, quoteId: string, raw: string) {
    const qty = Math.max(0, Number(raw) || 0);
    setAllocations((prev) => ({
      ...prev,
      [rfqItemId]: {
        ...(prev[rfqItemId] ?? {}),
        [quoteId]: qty,
      },
    }));
  }

  function handleSaveAllocations() {
    if (!rfq || !id) return;
    const { valid, errors } = validateAllocations(rfq, allocations);
    if (!valid) {
      toast.error(errors[0] ?? 'Invalid allocation');
      return;
    }
    saveAllocations(id, allocations);
    toast.success('Allocations saved');
  }

  function handleSelectQuote(quoteId: string) {
    setPickedQuoteId(quoteId);
    toast.success('Supplier selected. Allocate only the materials you want, then create the PO.');
  }

  async function handleCreatePo() {
    const quoteId = pickedQuoteId ?? scores[0]?.quoteId;
    if (!quoteId) {
      toast.error('Select a supplier first');
      return;
    }
    if (!rfq) {
      toast.error('RFQ not loaded');
      return;
    }
    const { valid, errors } = validateAllocations(rfq, allocations);
    if (!valid) {
      toast.error(errors[0] ?? 'Invalid allocation');
      return;
    }
    if (selectedQuotePoItems.length === 0) {
      toast.error('Allocate quantity to the selected supplier for the materials you want on this PO');
      return;
    }
    try {
      await acceptQuote.mutateAsync({
        id: quoteId,
        items: selectedQuotePoItems.map(({ quotationItemId, rfqItemId, orderQty }) => ({
          quotationItemId,
          rfqItemId,
          orderQty,
        })),
      });
      toast.success(
        `Purchase order created for ${selectedQuotePoItems.length} material${selectedQuotePoItems.length === 1 ? '' : 's'}`,
      );
      navigate('/purchase-orders');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Could not create PO from this bid';
      toast.error(msg);
    }
  }

  if (isLoading) {
    return (
      <AppLayout active="RFQs">
        <Skeleton className="mb-4 h-8 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="mt-4 h-64" />
      </AppLayout>
    );
  }

  if (isError || !rfq) {
    return (
      <AppLayout active="RFQs">
        <p className="text-slate-600">RFQ not found.</p>
        <Button variant="link" onClick={() => navigate('/rfqs')}>
          Back to RFQs
        </Button>
      </AppLayout>
    );
  }

  return (
    <AppLayout active="RFQs">
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2 text-slate-600"
            onClick={() => navigate(`/rfqs/${id}`)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to RFQ
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Bid comparison
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {rfq.rfqNumber} — {rfq.title}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="Evaluation" />
              {pickedQuoteId && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={acceptQuote.isPending || selectedQuotePoItems.length === 0}
                  onClick={handleCreatePo}
                >
                  <ShoppingCart className="mr-1.5 h-4 w-4" />
                  Create PO ({selectedQuotePoItems.length})
                </Button>
              )}
            </div>
          </div>
        </div>

        {bids.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-slate-500">
              No submitted supplier quotes yet. Share the portal link and wait for responses.
              <div className="mt-4">
                <Button variant="outline" asChild>
                  <Link to={`/rfqs/${id}`}>Back to RFQ</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {summary && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                  title="Highest score"
                  value={summary.top.supplierName}
                  sub={`Score: ${summary.top.weightedScore}`}
                  accent="bg-emerald-500"
                  icon={<Trophy className="h-5 w-5 text-emerald-600" />}
                />
                <SummaryCard
                  title="Lowest price"
                  value={formatMoney(summary.lowest.totalPrice)}
                  sub={summary.lowest.supplierName}
                  accent="bg-sky-500"
                  icon={<Star className="h-5 w-5 text-sky-600" />}
                />
                <SummaryCard
                  title="Fastest delivery"
                  value={
                    summary.fastest
                      ? `${summary.fastest.leadTimeDays} days`
                      : '—'
                  }
                  sub={summary.fastest?.supplierName ?? 'No lead time data'}
                  accent="bg-indigo-500"
                  icon={<CheckCircle2 className="h-5 w-5 text-indigo-600" />}
                />
                <SummaryCard
                  title="Total bids"
                  value={String(summary.totalBids)}
                  sub={`${summary.activeBids} active`}
                  accent="bg-amber-500"
                  icon={<Award className="h-5 w-5 text-amber-600" />}
                />
              </div>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Scoring weights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={priceWeight}
                  onChange={(e) => setPriceWeight(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer accent-indigo-600"
                  aria-label="Price weight"
                />
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-lg border-2 border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800">
                    Price: {priceWeight}%
                  </span>
                  <span className="rounded-lg border-2 border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
                    Lead time: {leadWeight}%
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Weighted score = price score × {priceWeight}% + lead time score × {leadWeight}%.
                  Best price and fastest delivery each earn up to 100 points.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Score summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-xs uppercase">Rank</TableHead>
                      <TableHead className="text-xs uppercase">Supplier</TableHead>
                      <TableHead className="text-xs uppercase">Total price</TableHead>
                      <TableHead className="text-xs uppercase">Lead time</TableHead>
                      <TableHead className="text-center text-xs uppercase">Price score</TableHead>
                      <TableHead className="text-center text-xs uppercase">LT score</TableHead>
                      <TableHead className="text-center text-xs uppercase">Weighted</TableHead>
                      <TableHead className="text-xs uppercase">Status</TableHead>
                      <TableHead className="text-right text-xs uppercase">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.map((row) => {
                      const isTop = row.rank === 1;
                      const isPicked = pickedQuoteId === row.quoteId;
                      const isAwarded = awardedQuoteIds.has(row.quoteId);
                      const quote = bids.find((b) => b.id === row.quoteId);
                      const leadDisplay =
                        quote && parseLeadTimeDays(quote.notes) != null
                          ? `${row.leadTimeDays} days`
                          : '—';
                      const lowestPrice =
                        summary && row.totalPrice === summary.lowest.totalPrice;

                      return (
                        <TableRow
                          key={row.quoteId}
                          className={cn(
                            isTop && 'border-l-4 border-l-emerald-500 bg-emerald-50/30',
                          )}
                        >
                          <TableCell className="font-medium">
                            <span className="inline-flex items-center gap-1">
                              #{row.rank}
                              {isTop && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                            </span>
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold">{row.supplierName}</p>
                            {row.email && (
                              <p className="text-xs text-slate-500">{row.email}</p>
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'font-medium tabular-nums',
                              lowestPrice && 'text-emerald-700',
                            )}
                          >
                            {formatMoney(row.totalPrice)}
                          </TableCell>
                          <TableCell className="text-indigo-700">{leadDisplay}</TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex min-w-[2.5rem] justify-center rounded border bg-white px-2 py-0.5 text-xs font-medium tabular-nums">
                              {row.priceScore}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex min-w-[2.5rem] justify-center rounded border bg-white px-2 py-0.5 text-xs font-medium tabular-nums">
                              {row.leadTimeScore}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                'inline-flex min-w-[2.5rem] justify-center rounded px-2 py-0.5 text-xs font-bold tabular-nums text-white',
                                isTop ? 'bg-emerald-600' : 'bg-slate-500',
                              )}
                            >
                              {row.weightedScore}
                            </span>
                          </TableCell>
                          <TableCell>
                            {isAwarded || isPicked ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-white">
                                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                Selected
                              </span>
                            ) : (
                              <StatusBadge status="Submitted" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!isAwarded && (
                              <Button
                                size="sm"
                                variant={isPicked ? 'default' : 'outline'}
                                className={isPicked ? 'bg-indigo-600' : ''}
                                disabled={acceptQuote.isPending}
                                onClick={() => handleSelectQuote(row.quoteId)}
                              >
                                Select
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Product-wise comparison & allocation</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    Allocate quantities across suppliers. Total allocated:{' '}
                    <span className="font-semibold text-slate-800">
                      {grandAllocatedQty.allocated} / {grandAllocatedQty.required}
                    </span>
                  </p>
                  {selectedQuote && (
                    <p className="mt-1 text-xs text-slate-500">
                      PO will include only the <span className="font-semibold text-slate-800">{selectedQuotePoItems.length}</span>{' '}
                      allocated material{selectedQuotePoItems.length === 1 ? '' : 's'} for{' '}
                      <span className="font-semibold text-slate-800">
                        {selectedQuote.supplier?.supplierName}
                      </span>
                      .
                    </p>
                  )}
                </div>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleSaveAllocations}
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  Save allocations
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="min-w-[140px] text-xs uppercase">Product</TableHead>
                      <TableHead className="text-xs uppercase">Required qty</TableHead>
                      {bids.map((quote) => {
                        const score = scores.find((s) => s.quoteId === quote.id);
                        const lead = parseLeadTimeDays(quote.notes);
                        const isSel =
                          pickedQuoteId === quote.id || awardedQuoteIds.has(quote.id);
                        return (
                          <TableHead key={quote.id} className="min-w-[160px] text-center">
                            <p className="font-semibold text-slate-900">
                              {quote.supplier?.supplierName}
                            </p>
                            <p className="mt-0.5 text-[10px] font-medium uppercase text-slate-500">
                              Lead: {lead != null ? `${lead}d` : '—'}
                            </p>
                            <p className="text-xs text-slate-600">
                              {formatMoney(score?.totalPrice ?? 0)}
                            </p>
                            {isSel && (
                              <span className="mt-1 inline-block rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium uppercase text-white">
                                Selected
                              </span>
                            )}
                          </TableHead>
                        );
                      })}
                      <TableHead className="text-center text-xs uppercase">Total allocated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rfq.items ?? []).map((rfqItem, index) => {
                      const required = Number(rfqItem.quantity);
                      const rowTotal = totalAllocatedForItem(allocations, rfqItem.id);
                      const over = rowTotal > required;
                      const productLabel =
                        rfqItem.product?.productCode ?? rfqItem.description ?? 'Item';
                      const productSub =
                        rfqItem.product?.description &&
                        rfqItem.product?.productCode !== rfqItem.product?.description
                          ? rfqItem.product.description
                          : null;

                      return (
                        <TableRow key={rfqItem.id}>
                          <TableCell>
                            <p className="font-medium">{productLabel}</p>
                            {productSub && (
                              <p className="text-xs text-slate-500">{productSub}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            {required} {rfqItem.uom}
                          </TableCell>
                          {bids.map((quote) => {
                            const line = getQuoteLineForRfqItem(quote, rfqItem.id, index);
                            const unit = unitPriceForLine(line);
                            const val = allocations[rfqItem.id]?.[quote.id] ?? '';
                            return (
                              <TableCell key={quote.id} className="align-top">
                                <p className="mb-1.5 text-center text-xs font-medium text-slate-600">
                                  {unit > 0 ? `${formatMoney(unit)} / unit` : '—'}
                                </p>
                                <Input
                                  type="number"
                                  min={0}
                                  max={required}
                                  className="h-9 text-center"
                                  value={val === 0 ? '' : val}
                                  onChange={(e) =>
                                    setAllocation(rfqItem.id, quote.id, e.target.value)
                                  }
                                />
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
                                over
                                  ? 'bg-red-100 text-red-800'
                                  : rowTotal === required
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-700',
                              )}
                            >
                              {rowTotal} / {required}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-slate-50/60 font-medium">
                      <TableCell colSpan={2}>Allocated cost</TableCell>
                      {bids.map((quote) => (
                        <TableCell key={quote.id} className="text-center tabular-nums">
                          {formatMoney(allocatedCosts[quote.id] ?? 0)}
                        </TableCell>
                      ))}
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
