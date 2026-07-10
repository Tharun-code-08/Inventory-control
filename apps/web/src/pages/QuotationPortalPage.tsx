import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, FileText, IndianRupee, MessageSquare, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/cn';
import { portalGet, portalPost } from '@/lib/portal-api';

type PortalQuotation = {
  id: string;
  quoteNumber: string;
  quoteDate: string;
  validUntil?: string | null;
  status: string;
  remarks?: string | null;
  totalValue: string;
  customerRequestedTotal?: string | null;
  customerRequestNote?: string | null;
  canRespond: boolean;
  customer: { customerName: string; email?: string | null };
  shop: { shopName: string; shopNumber?: string };
  items: Array<{
    id: string;
    productCode: string;
    description: string;
    quantity: string;
    uom: string;
    unitPrice: string;
    lineValue: string;
  }>;
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(value?: string | number | null): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

function statusMessage(status: string): string {
  if (status === 'ACCEPTED') {
    return 'You have accepted this quotation. Our team will follow up with the next steps.';
  }
  if (status === 'USER_REQUESTED') {
    return 'Your pricing feedback has been submitted. We will review your request and may send a revised quotation.';
  }
  if (status === 'CANCELLED') {
    return 'This quotation is no longer active.';
  }
  if (status === 'CONVERTED') {
    return 'This quotation has been processed.';
  }
  return 'This quotation is no longer awaiting your response.';
}

export function QuotationPortalPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [quote, setQuote] = useState<PortalQuotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [requestedTotal, setRequestedTotal] = useState('');
  const [note, setNote] = useState('');

  const quotedTotal = useMemo(() => Number(quote?.totalValue ?? 0), [quote?.totalValue]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await portalGet<PortalQuotation>(
          `/quotation-portal/quotes/${encodeURIComponent(token)}`,
        );
        if (!cancelled) setQuote(data);
      } catch (e) {
        if (!cancelled) {
          setQuote(null);
          toast.error(e instanceof Error ? e.message : 'Unable to load quotation');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setActing(true);
    try {
      const result = await portalPost<{ message: string; quotation: PortalQuotation }>(
        `/quotation-portal/quotes/${encodeURIComponent(token)}/accept`,
      );
      setQuote(result.quotation);
      toast.success(result.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unable to accept quotation');
    } finally {
      setActing(false);
    }
  }

  async function handleRequestRevision() {
    if (!token) return;
    const amount = Number(requestedTotal);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter a valid target amount.');
      return;
    }
    if (amount >= quotedTotal) {
      toast.error('Your target amount should be lower than the quoted total.');
      return;
    }
    setActing(true);
    try {
      const result = await portalPost<{ message: string; quotation: PortalQuotation }>(
        `/quotation-portal/quotes/${encodeURIComponent(token)}/request-revision`,
        { requestedTotal: amount, note: note.trim() || undefined },
      );
      setQuote(result.quotation);
      setRevisionOpen(false);
      toast.success(result.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unable to submit your request');
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-4 text-white shadow-md">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold text-white">SoftdigitIMS</span>
            <span className="text-[11px] text-slate-300">Quotation Review</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 pb-16">
        {!token && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-6 text-amber-900">
            Invalid link. Please open the quotation from the email we sent you.
          </div>
        )}

        {token && loading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
            Loading quotation…
          </div>
        )}

        {token && !loading && !quote && (
          <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-6 text-red-800 dark:text-red-300">
            This quotation link is invalid or has expired.
          </div>
        )}

        {quote && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-primary">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-semibold text-foreground">{quote.quoteNumber}</h1>
                  <p className="text-sm text-muted-foreground">
                    Prepared for <strong>{quote.customer.customerName}</strong>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {quote.shop.shopName} · Quote date {formatDate(quote.quoteDate)}
                    {quote.validUntil ? ` · Valid until ${formatDate(quote.validUntil)}` : ''}
                  </p>
                </div>
              </div>

              {!quote.canRespond && (
                <div
                  className={cn(
                    'rounded-lg border px-4 py-3 text-sm',
                    quote.status === 'ACCEPTED'
                      ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900'
                      : 'border-border bg-muted text-foreground',
                  )}
                >
                  {statusMessage(quote.status)}
                </div>
              )}

              {quote.status === 'USER_REQUESTED' && quote.customerRequestedTotal && (
                <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
                  Your requested total:{' '}
                  <strong>{formatAmount(quote.customerRequestedTotal)}</strong>
                  {quote.customerRequestNote ? (
                    <p className="mt-1 text-amber-800 dark:text-amber-300">{quote.customerRequestNote}</p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>UoM</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quote.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-medium text-foreground">{item.productCode}</span>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">{item.uom}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatAmount(item.lineValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t bg-muted px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <IndianRupee className="h-4 w-4" />
                  Grand total
                </span>
                <span className="text-lg font-bold text-foreground tabular-nums">
                  {formatAmount(quote.totalValue)}
                </span>
              </div>
            </div>

            {quote.remarks && (
              <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
                <p className="mb-1 font-medium text-foreground">Notes</p>
                <p className="whitespace-pre-wrap">{quote.remarks}</p>
              </div>
            )}

            {quote.canRespond && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={acting}
                  onClick={handleAccept}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Accept quotation
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-border"
                  disabled={acting}
                  onClick={() => setRevisionOpen(true)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Request revised pricing
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request revised pricing</DialogTitle>
            <DialogDescription>
              We appreciate your feedback. If the quoted total does not align with your
              expectations, please share your target amount below. Our commercial team will
              review your request and may issue a revised quotation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Current quoted total:{' '}
              <strong className="text-foreground">{formatAmount(quotedTotal)}</strong>
            </p>
            <div className="space-y-2">
              <Label htmlFor="requested-total">Your target total (INR)</Label>
              <Input
                id="requested-total"
                type="number"
                min={0}
                step="0.01"
                placeholder="Enter amount lower than quoted total"
                value={requestedTotal}
                onChange={(e) => setRequestedTotal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revision-note">Additional comments (optional)</Label>
              <Textarea
                id="revision-note"
                rows={3}
                placeholder="Brief context for your request"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRevisionOpen(false)} disabled={acting}>
              Cancel
            </Button>
            <Button
              className=""
              disabled={acting}
              onClick={handleRequestRevision}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
