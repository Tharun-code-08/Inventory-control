import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, PackageSearch } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/cn';
import { portalGet, portalPost } from '@/lib/portal-api';

type PortalReturnOrder = {
  id: string;
  returnNumber: string;
  returnDate: string;
  status: string;
  canAcknowledge: boolean;
  acknowledgedAt?: string | null;
  postedAt?: string | null;
  supplierName: string;
  grNumber: string;
  shopName: string;
  supplierRef?: string | null;
  remarks?: string | null;
  items: Array<{
    id: string;
    productCode: string;
    description: string;
    grnQuantity: string;
    returnQuantity: string;
    reason: string;
    images: Array<{ id: string; url: string; filename: string }>;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusTone(status: string) {
  if (status === 'DONE') return 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300';
  if (status === 'SUBMITTED') return 'border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-300';
  return 'border-border bg-muted text-foreground';
}

function formatStatus(status: string) {
  if (status === 'DONE') return 'Completed';
  if (status === 'SUBMITTED') return 'Awaiting Your Acknowledgement';
  return status;
}

export function ReturnAcknowledgementPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [order, setOrder] = useState<PortalReturnOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await portalGet<PortalReturnOrder>(`/returns/supplier/public/${encodeURIComponent(token)}`);
        if (!cancelled) setOrder(data);
      } catch (error) {
        if (!cancelled) {
          setOrder(null);
          toast.error(error instanceof Error ? error.message : 'Unable to load return notice');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const acknowledge = async () => {
    if (!token) return;
    setActing(true);
    try {
      const result = await portalPost<{ message: string; returnOrder: PortalReturnOrder }>(
        `/returns/supplier/public/${encodeURIComponent(token)}/acknowledge`,
      );
      setOrder(result.returnOrder);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to acknowledge return notice');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-4 text-white shadow-md">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold text-white">SoftdigitIMS</span>
            <span className="text-[11px] text-slate-300">Supplier Return Acknowledgement</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 pb-16">
        {!token ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-6 text-amber-900">
            Invalid link. Please open the acknowledgement link from your return notice email.
          </div>
        ) : null}

        {token && loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
            Loading return notice...
          </div>
        ) : null}

        {token && !loading && !order ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-6 text-red-800 dark:text-red-300">
            This return acknowledgement link is invalid or has expired.
          </div>
        ) : null}

        {order ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-primary">
                  <PackageSearch className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-semibold text-foreground">{order.returnNumber}</h1>
                    <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium', statusTone(order.status))}>
                      {formatStatus(order.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Supplier <strong>{order.supplierName}</strong> · GRN <strong>{order.grNumber}</strong>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.shopName} · Return date {formatDate(order.returnDate)}
                  </p>
                </div>
              </div>

              {order.remarks ? (
                <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">
                  {order.remarks}
                </div>
              ) : null}

              {order.canAcknowledge ? (
                <div className="mt-4 rounded-lg border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 px-4 py-3 text-sm text-sky-900">
                  Please review the returned items and acknowledge the notice. Stock will be reduced only after you confirm this return.
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900">
                  This return notice was acknowledged on {formatDate(order.acknowledgedAt)} and stock has already been adjusted.
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">GRN Qty</TableHead>
                    <TableHead className="text-right">Return Qty</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Images</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-medium text-foreground">{item.productCode}</span>
                        <span className="block text-xs text-muted-foreground">{item.description}</span>
                      </TableCell>
                      <TableCell className="text-right">{item.grnQuantity}</TableCell>
                      <TableCell className="text-right">{item.returnQuantity}</TableCell>
                      <TableCell>{item.reason}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {item.images.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No images</span>
                          ) : (
                            item.images.map((image) => (
                              <a
                                key={image.id}
                                href={image.url}
                                target="_blank"
                                rel="noreferrer"
                                className="overflow-hidden rounded-md border"
                              >
                                <img
                                  src={image.url}
                                  alt={image.filename}
                                  className="h-16 w-16 object-cover"
                                />
                              </a>
                            ))
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {order.canAcknowledge ? (
                <Button
                  className=""
                  disabled={acting}
                  onClick={acknowledge}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {acting ? 'Acknowledging...' : 'Acknowledge And Process Return'}
                </Button>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 text-sm text-emerald-900">
                  <CheckCircle2 className="h-4 w-4" />
                  Acknowledgement recorded
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default ReturnAcknowledgementPage;
