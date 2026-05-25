import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  FileDown,
  Paperclip,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { ConfirmDialog } from '@/components/shared';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Skeleton } from '@/components/ui/skeleton';
import { useRfq, useDeleteRfq, rfqPortalAccessCode } from '@/hooks/use-rfqs';
import {
  useQuotations,
  useAcceptAutoLinkQuotation,
  type Quotation,
  type QuotationItem,
} from '@/hooks/use-quotations';
import { useContracts } from '@/hooks/use-contracts';
import { supplierPortalSubmitUrl } from '@/lib/portal-api';
import {
  buildAllocationPlan,
  clearQuoteAllocations,
  loadAllocations,
  saveAllocations,
  validateAllocations,
  type RfqAllocationMap,
} from '@/lib/bid-comparison';
import { cn } from '@/lib/cn';
import { getApiErrorMessage } from '@/lib/api-error';
import { csvDate, csvList, csvMoney, exportModuleCsv } from '@/lib/module-csv';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function quoteTotal(items: QuotationItem[] | undefined): number {
  if (!items?.length) return 0;
  return items.reduce((sum, it) => sum + Number(it.lineValue ?? 0), 0);
}

function parseLeadTimeDays(notes?: string | null): number | null {
  if (!notes) return null;
  const match = notes.match(/Lead time:\s*(\d+)\s*days/i);
  return match ? Number(match[1]) : null;
}

function rfqStatusLabel(status: string): string {
  if (status === 'POSTED') return 'Sent';
  if (status === 'DRAFT') return 'Draft';
  return status;
}

function formatDisplayNotes(notes?: string | null): string {
  if (!notes?.trim()) return '—';
  const cleaned = notes
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^\[(Sent|Closed) /i.test(line));
  return cleaned.join('\n').trim() || '—';
}

function DetailField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-1.5 text-sm leading-snug text-slate-900">{children}</div>
    </div>
  );
}

function ResponseRow({
  quote,
  expanded,
  onToggle,
  isAwarded,
  onSelect,
  selecting,
}: {
  quote: Quotation;
  expanded: boolean;
  onToggle: () => void;
  isAwarded: boolean;
  onSelect: () => void;
  selecting: boolean;
}) {
  const total = quoteTotal(quote.items);
  const leadDays = parseLeadTimeDays(quote.notes);

  return (
    <>
      <TableRow className="hover:bg-slate-50/60">
        <TableCell className="w-10">
          <button
            type="button"
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            onClick={onToggle}
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </TableCell>
        <TableCell>
          <p className="font-semibold text-slate-900">{quote.supplier?.supplierName ?? '—'}</p>
          {quote.supplier?.email && (
            <p className="text-xs text-slate-500">{quote.supplier.email}</p>
          )}
        </TableCell>
        <TableCell className="font-medium tabular-nums">{formatMoney(total)}</TableCell>
        <TableCell className="text-sm text-slate-600">
          {leadDays != null ? `${leadDays} days` : '—'}
        </TableCell>
        <TableCell>
          {isAwarded ? (
            <span className="inline-flex rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-medium text-white">
              Selected
            </span>
          ) : (
            <StatusBadge status={quote.status === 'POSTED' ? 'Submitted' : quote.status} />
          )}
        </TableCell>
        <TableCell className="max-w-[180px] truncate text-sm text-slate-600">
          {quote.notes?.split('\n')[0] ?? '—'}
        </TableCell>
        <TableCell className="text-right">
          {!isAwarded && quote.status === 'POSTED' && (
            <Button size="sm" variant="outline" disabled={selecting} onClick={onSelect}>
              Select
            </Button>
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-slate-50/40">
          <TableCell colSpan={7} className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase">Item</TableHead>
                  <TableHead className="text-xs uppercase">Qty</TableHead>
                  <TableHead className="text-xs uppercase">Unit price</TableHead>
                  <TableHead className="text-xs uppercase">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(quote.items ?? []).map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="text-sm">
                      {line.product?.productCode ?? line.description ?? '—'}
                      {line.product?.description && (
                        <span className="block text-xs text-slate-500">
                          {line.product.description}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{Number(line.quantity)}</TableCell>
                    <TableCell>{formatMoney(Number(line.unitPrice))}</TableCell>
                    <TableCell>{formatMoney(Number(line.lineValue))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function RfqDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: rfq, isLoading, isError } = useRfq(id);
  const { data: quotations = [] } = useQuotations(id);
  const { data: contracts = [] } = useContracts();
  const acceptQuote = useAcceptAutoLinkQuotation();
  const deleteRfq = useDeleteRfq();

  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [savedAllocations, setSavedAllocations] = useState<RfqAllocationMap>({});
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [creatingQuoteId, setCreatingQuoteId] = useState<string | null>(null);
  const [isCreatingAll, setIsCreatingAll] = useState(false);

  const awardedQuoteIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of contracts) {
      if (c.quotationId && (!c.rfqId || c.rfqId === id)) set.add(c.quotationId);
    }
    return set;
  }, [contracts, id]);

  const portalUrl = id ? supplierPortalSubmitUrl(id) : '';
  const accessCode = id ? rfqPortalAccessCode(id) : '';

  useEffect(() => {
    if (!id) return;
    setSavedAllocations(loadAllocations(id));
  }, [id]);

  function toggleQuote(quoteId: string) {
    setExpandedQuotes((prev) => {
      const next = new Set(prev);
      if (next.has(quoteId)) next.delete(quoteId);
      else next.add(quoteId);
      return next;
    });
  }

  function copyAccessCode() {
    void navigator.clipboard.writeText(accessCode);
    toast.success('Access code copied');
  }

  function copyPortalLink() {
    void navigator.clipboard.writeText(portalUrl);
    toast.success('Portal link copied');
  }

  function handleExportDetail() {
    const rows = rfq.items.map((item) => ({ rfq, item }));
    const ok = exportModuleCsv(`${rfq.rfqNumber}.csv`, rows, [
      { header: 'RFQ Number', value: ({ rfq: current }) => current.rfqNumber },
      { header: 'Title', value: ({ rfq: current }) => current.title },
      { header: 'Status', value: ({ rfq: current }) => rfqStatusLabel(current.status) },
      { header: 'RFQ Date', value: ({ rfq: current }) => csvDate(current.rfqDate) },
      { header: 'Deadline', value: ({ rfq: current }) => csvDate(current.deadline) },
      { header: 'Plant', value: ({ rfq: current }) => current.shop?.shopName ?? '' },
      {
        header: 'Suppliers',
        value: ({ rfq: current }) =>
          csvList(current.suppliers.map((entry) => entry.supplier?.supplierName ?? entry.supplierId)),
      },
      { header: 'Item Code', value: ({ item }) => item.product?.productCode ?? '' },
      {
        header: 'Item Description',
        value: ({ item }) => item.product?.description ?? item.description ?? '',
      },
      { header: 'Requested Qty', value: ({ item }) => item.quantity },
      { header: 'UOM', value: ({ item }) => item.uom },
      { header: 'Specifications', value: ({ item }) => item.specifications ?? '' },
      {
        header: 'Quoted Suppliers',
        value: () => quotations.length,
      },
      {
        header: 'Selected Supplier',
        value: () => selectedQuote?.supplier?.supplierName ?? '',
      },
      {
        header: 'Selected Quote Total',
        value: () => (selectedQuote ? csvMoney(quoteTotal(selectedQuote.items)) : ''),
      },
    ]);
    if (ok) toast.success('RFQ detail exported');
    else toast.error('No RFQ items to export');
  }

  const primaryAwarded = quotations.find((q) => awardedQuoteIds.has(q.id));
  const selectedQuote =
    quotations.find((q) => q.id === selectedQuoteId) ?? primaryAwarded ?? null;
  const allocationPlans = useMemo(
    () => (rfq ? buildAllocationPlan(rfq, quotations, savedAllocations) : []),
    [quotations, rfq, savedAllocations],
  );
  const allocationValidation = useMemo(
    () =>
      rfq
        ? validateAllocations(rfq, quotations, savedAllocations)
        : { valid: true, errors: [] as string[] },
    [quotations, rfq, savedAllocations],
  );

  function handleSelectQuote(quoteId: string) {
    setSelectedQuoteId(quoteId);
    toast.success('Supplier selected. Save quantities in Compare bids, then create the PO from the top action.');
  }

  function persistAllocations(next: RfqAllocationMap) {
    setSavedAllocations(next);
    if (id) {
      saveAllocations(id, next);
    }
  }

  async function createPoForAllocationPlan(quoteId: string) {
    const plan = allocationPlans.find((entry) => entry.quoteId === quoteId);
    if (!plan) {
      toast.error('No saved allocation found for that supplier');
      return;
    }
    if (!allocationValidation.valid) {
      toast.error(allocationValidation.errors[0] ?? 'Invalid saved allocation');
      return;
    }

    setCreatingQuoteId(quoteId);
    try {
      const result = await acceptQuote.mutateAsync({
        id: quoteId,
        items: plan.items.map((item) => ({
          quotationItemId: item.quotationItemId,
          rfqItemId: item.rfqItemId,
          orderQty: item.allocatedQty,
        })),
      });
      const po = (result as { purchaseOrder?: { poNumber?: string } })?.purchaseOrder;
      persistAllocations(clearQuoteAllocations(savedAllocations, quoteId));
      toast.success(
        po?.poNumber
          ? `PO ${po.poNumber} created for ${plan.supplierName}`
          : `Purchase order created for ${plan.supplierName}`,
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Could not create PO from saved allocation';
      toast.error(msg);
    } finally {
      setCreatingQuoteId(null);
    }
  }

  async function createAllPurchaseOrders() {
    if (allocationPlans.length === 0) {
      toast.error('Save allocations in Compare bids before creating a PO');
      return;
    }
    if (!allocationValidation.valid) {
      toast.error(allocationValidation.errors[0] ?? 'Invalid saved allocation');
      return;
    }

    setIsCreatingAll(true);
    try {
      let nextAllocations = savedAllocations;
      for (const plan of allocationPlans) {
        const result = await acceptQuote.mutateAsync({
          id: plan.quoteId,
          items: plan.items.map((item) => ({
            quotationItemId: item.quotationItemId,
            rfqItemId: item.rfqItemId,
            orderQty: item.allocatedQty,
          })),
        });
        const po = (result as { purchaseOrder?: { poNumber?: string } })?.purchaseOrder;
        nextAllocations = clearQuoteAllocations(nextAllocations, plan.quoteId);
        persistAllocations(nextAllocations);
        toast.success(
          po?.poNumber
            ? `PO ${po.poNumber} created for ${plan.supplierName}`
            : `Purchase order created for ${plan.supplierName}`,
        );
      }
      setPoDialogOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Could not create purchase orders from saved allocations';
      toast.error(msg);
    } finally {
      setIsCreatingAll(false);
    }
  }

  const linkedContractCount = useMemo(
    () => contracts.filter((c) => c.rfqId === id).length,
    [contracts, id],
  );
  const canDeleteRfq = quotations.length === 0 && linkedContractCount === 0;

  async function confirmDeleteRfq() {
    if (!id || !rfq) return;
    try {
      await deleteRfq.mutateAsync(id);
      toast.success(`${rfq.rfqNumber} deleted`);
      navigate('/rfqs');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete RFQ'));
    } finally {
      setDeleteOpen(false);
    }
  }

  if (isLoading) {
    return (
      <AppLayout active="RFQs">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  if (isError || !rfq) {
    return (
      <AppLayout active="RFQs">
        <div className="py-12 text-center">
          <p className="text-slate-600">RFQ not found.</p>
          <Button variant="link" className="mt-2" onClick={() => navigate('/rfqs')}>
            Back to RFQs
          </Button>
        </div>
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
            onClick={() => navigate('/rfqs')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {rfq.rfqNumber}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{rfq.title}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExportDetail}>
                <FileDown className="mr-1.5 h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" disabled>
                <ClipboardList className="mr-1.5 h-4 w-4" />
                Evaluation
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-indigo-200 text-indigo-700"
                onClick={() => navigate(`/rfqs/${id}/compare`)}
              >
                <ArrowLeftRight className="mr-1.5 h-4 w-4" />
                Compare bids
              </Button>
              {quotations.length > 0 && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={acceptQuote.isPending || isCreatingAll}
                  onClick={() => {
                    if (allocationPlans.length === 0) {
                      toast.error('Save allocations in Compare bids before creating a PO');
                      return;
                    }
                    if (!allocationValidation.valid) {
                      toast.error(allocationValidation.errors[0] ?? 'Invalid saved allocation');
                      return;
                    }
                    setPoDialogOpen(true);
                  }}
                >
                  <ShoppingCart className="mr-1.5 h-4 w-4" />
                  Create PO
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={!canDeleteRfq || deleteRfq.isPending}
                title={
                  !canDeleteRfq
                    ? 'Remove linked quotations or contracts before deleting'
                    : 'Delete RFQ'
                }
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
          {rfq.fulfillment && (
            <Card className="mt-4 border-indigo-100 bg-indigo-50/60">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-indigo-900">
                <div>
                  <p className="font-semibold">
                    Lines ordered: {rfq.fulfillment.linesFullyOrdered}/{rfq.fulfillment.totalLines}
                  </p>
                  <p className="text-indigo-800">
                    Remaining lines: {rfq.fulfillment.linesRemaining} · POs used: {rfq.fulfillment.posCreated}/{rfq.fulfillment.maxPos}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">RFQ details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pt-0">
              <div className="grid gap-5 sm:grid-cols-2">
                <DetailField label="Title">
                  <p className="font-medium">{rfq.title}</p>
                </DetailField>
                <DetailField label="Deadline">
                  <p>{formatDate(rfq.deadline)}</p>
                </DetailField>
                <DetailField label="Status">
                  <StatusBadge status={rfqStatusLabel(rfq.status)} />
                </DetailField>
                <DetailField label="Created">
                  <p>{formatDate(rfq.rfqDate)}</p>
                </DetailField>
                <DetailField label="Notes" className="sm:col-span-2">
                  <p className="whitespace-pre-wrap text-slate-700">
                    {formatDisplayNotes(rfq.notes)}
                  </p>
                </DetailField>
              </div>

              <div className="mt-6 flex flex-1 flex-col justify-end">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Supplier portal access code
                  </p>
                  <p className="mt-2 font-mono text-2xl font-bold tracking-[0.2em] text-indigo-700">
                    {accessCode}
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-full justify-center bg-white"
                      onClick={copyAccessCode}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      Copy code
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-full justify-center bg-white"
                      onClick={copyPortalLink}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      Copy link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-full justify-center bg-white"
                      asChild
                    >
                      <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                        Open portal
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Suppliers</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pt-0">
              {rfq.suppliers?.length ? (
                <ul className="space-y-2">
                  {rfq.suppliers.map((s) => (
                    <li
                      key={s.supplierId}
                      className="flex min-h-[2.75rem] items-center rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm font-medium text-slate-800"
                    >
                      {s.supplier?.supplierName ?? s.supplierId}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex flex-1 items-center justify-center text-sm text-slate-500">
                  No suppliers linked.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-xs uppercase">Product</TableHead>
                  <TableHead className="text-xs uppercase">Qty</TableHead>
                  <TableHead className="text-xs uppercase">Unit</TableHead>
                  <TableHead className="text-xs uppercase">Specifications</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfq.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">
                        {item.product?.productCode ?? item.description ?? '—'}
                      </p>
                      {item.product?.productCode && item.description && (
                        <p className="text-xs text-slate-500">{item.description}</p>
                      )}
                    </TableCell>
                    <TableCell>{Number(item.quantity)}</TableCell>
                    <TableCell>{item.uom}</TableCell>
                    <TableCell className="text-slate-600">{item.specifications ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card id="supplier-responses">
          <CardHeader>
            <CardTitle className="text-base">Supplier responses</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {quotations.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-500">
                No quotes yet. Share the portal link after you send this RFQ.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="w-10" />
                    <TableHead className="text-xs uppercase">Supplier</TableHead>
                    <TableHead className="text-xs uppercase">Total price</TableHead>
                    <TableHead className="text-xs uppercase">Lead time</TableHead>
                    <TableHead className="text-xs uppercase">Status</TableHead>
                    <TableHead className="text-xs uppercase">Notes</TableHead>
                    <TableHead className="text-right text-xs uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((q) => (
                    <ResponseRow
                      key={q.id}
                      quote={q}
                      expanded={expandedQuotes.has(q.id)}
                      onToggle={() => toggleQuote(q.id)}
                      isAwarded={awardedQuoteIds.has(q.id) || selectedQuote?.id === q.id}
                      selecting={acceptQuote.isPending}
                      onSelect={() => handleSelectQuote(q.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Attachments</CardTitle>
            <Button variant="ghost" size="sm" className="text-indigo-600" disabled>
              <Paperclip className="mr-1 h-4 w-4" />
              Attach file
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">No attachments yet.</p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">
          <Link to="/rfqs" className="text-indigo-600 hover:underline">
            Back to RFQ list
          </Link>
        </p>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete RFQ?"
        description={
          rfq
            ? `Permanently delete ${rfq.rfqNumber} (${rfq.title})? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteRfq.isPending}
        onConfirm={confirmDeleteRfq}
      />

      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Purchase Order(s)</DialogTitle>
            <DialogDescription>
              {allocationPlans.length === 1
                ? 'One supplier is allocated. Review the summary below before creating the purchase order.'
                : `${allocationPlans.length} suppliers are allocated. Review each summary below before creating the purchase orders.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {!allocationValidation.valid ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {allocationValidation.errors[0]}
              </div>
            ) : null}

            {allocationPlans.map((plan) => (
              <div
                key={plan.quoteId}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{plan.supplierName}</p>
                  <p className="text-sm text-slate-600">
                    {formatMoney(plan.totalValue)} · Lead:{' '}
                    {plan.leadTimeDays != null ? `${plan.leadTimeDays} days` : '—'} ·{' '}
                    {plan.itemCount} item{plan.itemCount === 1 ? '' : 's'} allocated
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-indigo-200 text-indigo-700"
                  disabled={
                    acceptQuote.isPending ||
                    isCreatingAll ||
                    !allocationValidation.valid ||
                    creatingQuoteId === plan.quoteId
                  }
                  onClick={() => void createPoForAllocationPlan(plan.quoteId)}
                >
                  {creatingQuoteId === plan.quoteId ? 'Creating...' : 'Create PO'}
                </Button>
              </div>
            ))}
          </div>

          {allocationPlans.length > 1 ? (
            <div className="flex justify-end">
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={acceptQuote.isPending || isCreatingAll || !allocationValidation.valid}
                onClick={() => void createAllPurchaseOrders()}
              >
                {isCreatingAll ? 'Creating purchase orders...' : 'Create all purchase orders'}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
