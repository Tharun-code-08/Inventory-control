import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Send,
  Download,
  FileText,
  CheckCircle2,
  Repeat2,
  Eye,
  IndianRupee,
  MessageSquare,
  XCircle,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCustomers } from '@/hooks/use-customers';
import { useProducts, type Product } from '@/hooks/use-products';
import { useShops } from '@/hooks/use-shops';
import {
  useSalesQuotations,
  useCreateSalesQuotation,
  useSendSalesQuotation,
  useAcceptSalesQuotation,
  useConvertSalesQuotationToOrder,
  useUpdateSalesQuotation,
  useResendSalesQuotation,
  useCancelSalesQuotation,
  type QuotationEmailDelivery,
  type SalesQuotation,
} from '@/hooks/use-sales-quotations';
import { useAuthStore } from '@/store/authStore';
import { useCookieConsentStore } from '@/store/cookieConsentStore';
import { cn } from '@/lib/cn';
import { resolvePreferredOrgId, syncPreferredOrgId } from '@/lib/cookie-consent';
import { uiSurfaces } from '@/lib/ui-surfaces';
import { getApiErrorMessage } from '@/lib/api-error';
import { CreatePageLayout } from '@/components/shared';
import { DocumentDetailActions } from '@/components/shared/DocumentDetailActions';
import { csvDate, csvMoney, exportModuleCsv } from '@/lib/module-csv';

type QuoteTab =
  | 'all'
  | 'draft'
  | 'sent'
  | 'user_requested'
  | 'accepted'
  | 'converted'
  | 'cancelled';

type ReviseLine = {
  productId: string;
  label: string;
  quantity: number;
  uom: string;
  unitPrice: string;
};

function extractProductRows(raw: unknown): Product[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Product[];
  if (typeof raw === 'object') {
    const source = raw as { items?: Product[]; data?: Product[]; rows?: Product[] };
    if (Array.isArray(source.items)) return source.items;
    if (Array.isArray(source.data)) return source.data;
    if (Array.isArray(source.rows)) return source.rows;
  }
  return [];
}

function formatProductLabel(product: Product): string {
  const code = product.productCode?.trim() || '—';
  const name = product.description?.trim();
  return name ? `${code} — ${name}` : code;
}

type QuoteLine = {
  productId: string;
  quantity: string;
  unitPrice: string;
  uom: string;
};

const emptyQuoteLine = (): QuoteLine => ({
  productId: '',
  quantity: '1',
  unitPrice: '0',
  uom: 'UNIT',
});

function formatQuoteDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function quotationSentToast(delivery?: QuotationEmailDelivery): string {
  if (!delivery) return 'Quotation sent.';
  const parts = [
    `Sent to ${delivery.to}`,
    `from ${delivery.from}`,
    delivery.bcc ? `(copy to ${delivery.bcc})` : '',
    '— ask the customer to check spam/junk if not received.',
  ];
  return parts.filter(Boolean).join(' ');
}

function formatAmount(value?: string | number | null): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

function statusLabel(status: string): string {
  if (status === 'SENT') return 'Sent';
  if (status === 'ACCEPTED') return 'Accepted';
  if (status === 'CONVERTED') return 'Converted';
  if (status === 'DRAFT') return 'Draft';
  if (status === 'USER_REQUESTED') return 'Customer request';
  if (status === 'CANCELLED') return 'Cancelled';
  return status;
}

function StatusPill({ status }: { status: string }) {
  const label = statusLabel(status);
  const styles =
    status === 'SENT'
      ? 'bg-sky-100 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 dark:bg-sky-950/60 dark:text-sky-200'
      : status === 'USER_REQUESTED'
        ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
        : status === 'ACCEPTED'
          ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200'
          : status === 'CONVERTED'
            ? 'bg-muted text-primary'
            : status === 'CANCELLED'
              ? 'bg-muted text-muted-foreground dark:bg-slate-800 dark:text-muted-foreground'
              : 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 dark:bg-amber-950/40 dark:text-amber-200';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles,
      )}
    >
      {status === 'SENT' && <Send className="h-3 w-3" />}
      {status === 'USER_REQUESTED' && <MessageSquare className="h-3 w-3" />}
      {status === 'ACCEPTED' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
      {status === 'CONVERTED' && <Repeat2 className="h-3 w-3" />}
      {status === 'CANCELLED' && <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

type KpiCardProps = {
  label: string;
  value: number;
  accent: string;
  icon: React.ReactNode;
};

function KpiCard({ label, value, accent, icon }: KpiCardProps) {
  return (
    <Card interactive className={cn('group overflow-hidden transition-shadow duration-300 hover:shadow-lg', uiSurfaces.pageCard)}>
      <CardContent className="flex items-center gap-3.5 p-4">
        <span className={cn('h-11 w-1.5 shrink-0 rounded-full', accent)} aria-hidden />
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-border transition-transform duration-300 group-hover:scale-105">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums leading-tight tracking-tight text-foreground">{value}</p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuotationsPage({ createOnly = false }: { createOnly?: boolean }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const functionalCookiesEnabled = useCookieConsentStore((state) => state.preferences.functional);
  const { data: shops = [] } = useShops();
  const { data: customers = [] } = useCustomers();
  const { data: quotations = [] } = useSalesQuotations();
  const createQuote = useCreateSalesQuotation();
  const sendQuote = useSendSalesQuotation();
  const acceptQuote = useAcceptSalesQuotation();
  const convertQuote = useConvertSalesQuotationToOrder();
  const updateQuote = useUpdateSalesQuotation();
  const resendQuote = useResendSalesQuotation();
  const cancelQuote = useCancelSalesQuotation();

  const [viewQuote, setViewQuote] = useState<SalesQuotation | null>(null);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseTarget, setReviseTarget] = useState<SalesQuotation | null>(null);
  const [reviseLines, setReviseLines] = useState<ReviseLine[]>([]);
  const [tab, setTab] = useState<QuoteTab>('all');
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [form, setForm] = useState({
    customerId: '',
    validUntil: '',
    shopId: '',
  });
  const [items, setItems] = useState<QuoteLine[]>([emptyQuoteLine()]);
  const [submitMode, setSubmitMode] = useState<'draft' | 'send' | null>(null);
  const isSubmitting = submitMode !== null;

  const resolvedShopId = resolvePreferredOrgId(
    shops.map((shop) => shop.id),
    user?.shopId,
    form.shopId,
  );
  const productsQuery = useProducts({
    shopId: resolvedShopId || undefined,
    isActive: true,
    limit: 500,
    page: 1,
  });
  const products = useMemo(() => extractProductRows(productsQuery.data), [productsQuery.data]);

  const stats = useMemo(() => {
    const draft = quotations.filter((q) => q.status === 'DRAFT').length;
    const sent = quotations.filter((q) => q.status === 'SENT').length;
    const userRequested = quotations.filter((q) => q.status === 'USER_REQUESTED').length;
    const accepted = quotations.filter((q) => q.status === 'ACCEPTED').length;
    const converted = quotations.filter((q) => q.status === 'CONVERTED').length;
    const cancelled = quotations.filter((q) => q.status === 'CANCELLED').length;
    return {
      total: quotations.length,
      draft,
      sent,
      userRequested,
      accepted,
      converted,
      cancelled,
    };
  }, [quotations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotations.filter((row) => {
      if (tab === 'draft' && row.status !== 'DRAFT') return false;
      if (tab === 'sent' && row.status !== 'SENT') return false;
      if (tab === 'user_requested' && row.status !== 'USER_REQUESTED') return false;
      if (tab === 'accepted' && row.status !== 'ACCEPTED') return false;
      if (tab === 'converted' && row.status !== 'CONVERTED') return false;
      if (tab === 'cancelled' && row.status !== 'CANCELLED') return false;
      if (customerFilter !== 'all' && row.customerId !== customerFilter) return false;
      if (!q) return true;
      const customer = row.customer?.customerName?.toLowerCase() ?? '';
      return row.quoteNumber.toLowerCase().includes(q) || customer.includes(q);
    });
  }, [quotations, tab, search, customerFilter]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === form.customerId),
    [customers, form.customerId],
  );

  const resetCreateForm = () => {
    setForm({
      customerId: '',
      validUntil: '',
      shopId: user?.shopId ? form.shopId : resolvedShopId,
    });
    setItems([emptyQuoteLine()]);
    setSubmitMode(null);
  };

  const finishCreateFlow = () => {
    if (createOnly) {
      navigate('/quotations');
    }
    resetCreateForm();
  };

  useEffect(() => {
    syncPreferredOrgId(user?.shopId ? null : resolvedShopId, functionalCookiesEnabled);
  }, [functionalCookiesEnabled, resolvedShopId, user?.shopId]);

  useEffect(() => {
    const validIds = new Set(products.map((p) => p.id));
    setItems((prev) =>
      prev.map((row) =>
        row.productId && !validIds.has(row.productId) ? { ...row, productId: '' } : row,
      ),
    );
  }, [products]);

  const addItemRow = () => {
    setItems((prev) => [...prev, emptyQuoteLine()]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateItemRow = (
    index: number,
    key: keyof QuoteLine,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) return row;
        if (key === 'productId') {
          const selected = products.find((p) => p.id === value);
          return {
            ...row,
            productId: value,
            uom: selected?.uom || row.uom,
            unitPrice: String(selected?.sellingPrice ?? selected?.purchasePrice ?? 0),
          };
        }
        return { ...row, [key]: value };
      }),
    );
  };

  const createGrandTotal = useMemo(
    () =>
      items.reduce((sum, line) => {
        const qty = Number(line.quantity) || 0;
        const price = Number(line.unitPrice) || 0;
        return sum + qty * price;
      }, 0),
    [items],
  );

  const buildCreatePayload = () => {
    if (!form.customerId) {
      toast.error('Customer is required');
      return null;
    }
    if (createOnly && !resolvedShopId) {
      toast.error('No plant available for this quotation');
      return null;
    }
    const normalizedItems = items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId,
        quantity: Math.max(0.001, Number(item.quantity || 1)),
        unitPrice: Number(item.unitPrice) || 0,
        uom: item.uom || 'UNIT',
      }));
    if (normalizedItems.length === 0) {
      toast.error('Add at least one product');
      return null;
    }
    return {
      shopId: resolvedShopId || undefined,
      customerId: form.customerId,
      validUntil: form.validUntil || undefined,
      items: normalizedItems,
    };
  };

  const onCreateDraft = async () => {
    const payload = buildCreatePayload();
    if (!payload) return;

    setSubmitMode('draft');
    try {
      await createQuote.mutateAsync(payload);
      toast.success('Quotation saved as draft');
      finishCreateFlow();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to create quotation'));
    } finally {
      setSubmitMode(null);
    }
  };

  const onCreateAndSend = async () => {
    const payload = buildCreatePayload();
    if (!payload) return;
    if (!selectedCustomer?.email?.trim()) {
      toast.error('Customer has no email. Add an email on the customer profile before sending.');
      return;
    }

    setSubmitMode('send');
    try {
      const created = await createQuote.mutateAsync(payload);
      const sent = await sendQuote.mutateAsync(created.id);
      toast.success(quotationSentToast(sent.emailDelivery), { duration: 8000 });
      finishCreateFlow();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to create and send quotation'));
    } finally {
      setSubmitMode(null);
    }
  };

  async function onSend(q: SalesQuotation) {
    const email = q.customer?.email ?? customers.find((c) => c.id === q.customerId)?.email;
    if (!email?.trim()) {
      toast.error('Customer has no email on file. Update the customer profile first.');
      return;
    }
    try {
      const sent = await sendQuote.mutateAsync(q.id);
      toast.success(`${q.quoteNumber}: ${quotationSentToast(sent.emailDelivery)}`, {
        duration: 8000,
      });
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to send quotation'));
    }
  }

  async function onAccept(q: SalesQuotation) {
    try {
      await acceptQuote.mutateAsync(q.id);
      toast.success(`${q.quoteNumber} accepted`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to accept quotation'));
    }
  }

  async function onConvert(q: SalesQuotation) {
    try {
      const result = await convertQuote.mutateAsync(q.id);
      const so = result.salesOrder?.soNumber;
      toast.success(so ? `Converted to ${so}` : 'Converted to sales order');
      if (result.salesOrder?.id) navigate('/sales');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to convert to sales order'));
    }
  }

  function handleExportQuoteList() {
    const ok = exportModuleCsv('sales-quotations.csv', filtered, [
      { header: 'Quote Number', value: (quote) => quote.quoteNumber },
      { header: 'Quote Date', value: (quote) => csvDate(quote.quoteDate) },
      { header: 'Valid Until', value: (quote) => csvDate(quote.validUntil) },
      { header: 'Customer', value: (quote) => quote.customer?.customerName ?? '' },
      { header: 'Customer Email', value: (quote) => quote.customer?.email ?? '' },
      { header: 'Status', value: (quote) => statusLabel(quote.status) },
      { header: 'Items', value: (quote) => quote.items?.length ?? 0 },
      { header: 'Total Value', value: (quote) => csvMoney(quote.totalValue) },
      { header: 'Requested Total', value: (quote) => csvMoney(quote.customerRequestedTotal) },
      { header: 'Sales Order', value: (quote) => quote.salesOrder?.soNumber ?? '' },
    ]);
    if (ok) toast.success('Sales quotations exported');
    else toast.error('No sales quotations to export');
  }

  function handleExportQuoteDetail(quote: SalesQuotation) {
    const ok = exportModuleCsv(
      `${quote.quoteNumber}.csv`,
      (quote.items ?? []).map((item) => ({ quote, item })),
      [
        { header: 'Quote Number', value: ({ quote: current }) => current.quoteNumber },
        { header: 'Quote Date', value: ({ quote: current }) => csvDate(current.quoteDate) },
        { header: 'Valid Until', value: ({ quote: current }) => csvDate(current.validUntil) },
        { header: 'Customer', value: ({ quote: current }) => current.customer?.customerName ?? '' },
        { header: 'Status', value: ({ quote: current }) => statusLabel(current.status) },
        { header: 'Product Code', value: ({ item }) => item.product?.productCode ?? '' },
        { header: 'Description', value: ({ item }) => item.product?.description ?? '' },
        { header: 'Quantity', value: ({ item }) => item.quantity },
        { header: 'UOM', value: ({ item }) => item.uom },
        { header: 'Unit Price', value: ({ item }) => csvMoney(item.unitPrice) },
        { header: 'Line Value', value: ({ item }) => csvMoney(item.lineValue) },
        { header: 'Requested Total', value: ({ quote: current }) => csvMoney(current.customerRequestedTotal) },
        { header: 'Requested Note', value: ({ quote: current }) => current.customerRequestNote ?? '' },
        { header: 'Sales Order', value: ({ quote: current }) => current.salesOrder?.soNumber ?? '' },
      ],
    );
    if (ok) toast.success('Quotation exported');
    else toast.error('No quotation lines to export');
  }

  function openView(q: SalesQuotation) {
    setViewQuote(q);
  }

  function openRevise(q: SalesQuotation) {
    setReviseOpen(false);
    setViewQuote(null);
    setReviseTarget(q);
    setReviseLines(
      (q.items ?? []).map((item) => ({
        productId: item.productId,
        label: item.product
          ? `${item.product.productCode} — ${item.product.description}`
          : 'Line item',
        quantity: Number(item.quantity),
        uom: item.uom ?? 'UNIT',
        unitPrice: String(item.unitPrice ?? 0),
      })),
    );
    setReviseOpen(true);
  }

  const reviseGrandTotal = useMemo(
    () =>
      reviseLines.reduce((sum, line) => {
        const qty = line.quantity;
        const price = Number(line.unitPrice) || 0;
        return sum + qty * price;
      }, 0),
    [reviseLines],
  );

  async function onSaveAndResend() {
    if (!reviseTarget) return;
    const email = reviseTarget.customer?.email;
    if (!email?.trim()) {
      toast.error('Customer has no email on file.');
      return;
    }
    try {
      await updateQuote.mutateAsync({
        id: reviseTarget.id,
        payload: {
          items: reviseLines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            uom: line.uom,
            unitPrice: Number(line.unitPrice),
          })),
        },
      });
      const sent = await resendQuote.mutateAsync(reviseTarget.id);
      toast.success(
        `Revised ${reviseTarget.quoteNumber}: ${quotationSentToast(sent.emailDelivery)}`,
        { duration: 8000 },
      );
      setReviseOpen(false);
      setReviseTarget(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save and resend quotation'));
    }
  }

  async function onCancelQuote(q: SalesQuotation) {
    try {
      await cancelQuote.mutateAsync(q.id);
      toast.success(`${q.quoteNumber} cancelled`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to cancel quotation'));
    }
  }

  const quoteCreateForm = (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {!user?.shopId && (
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Plant</Label>
            <Select
              value={form.shopId || resolvedShopId}
              onValueChange={(v) => {
                setForm((p) => ({ ...p, shopId: v }));
                syncPreferredOrgId(v, functionalCookiesEnabled);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select plant" />
              </SelectTrigger>
              <SelectContent>
                {shops.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.shopName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Customer *</Label>
          <Select
            value={form.customerId}
            onValueChange={(v) => setForm((p) => ({ ...p, customerId: v }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.customerName}
                  {c.email ? ` (${c.email})` : ' — no email'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valid until</Label>
          <Input
            type="date"
            className="h-9"
            value={form.validUntil}
            onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
          />
        </div>
      </div>

      {selectedCustomer && !selectedCustomer.email?.trim() && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          This customer has no email — add one under Customers before using Send.
        </p>
      )}

      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Line items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
            + Add item
          </Button>
        </div>
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 rounded-lg border p-2">
            <div className="col-span-5">
              <Select
                value={item.productId}
                onValueChange={(v) => updateItemRow(index, 'productId', v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Product" />
                </SelectTrigger>
                <SelectContent className="max-w-[min(24rem,90vw)]">
                  {products.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      {productsQuery.isLoading ? 'Loading products…' : 'No products found'}
                    </SelectItem>
                  ) : (
                    products.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {formatProductLabel(p)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min="0.001"
                step="any"
                className="h-8 text-xs"
                value={item.quantity}
                onChange={(e) => updateItemRow(index, 'quantity', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Input className="h-8 text-xs" value={item.uom} readOnly />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min="0"
                step="any"
                className="h-8 text-xs"
                value={item.unitPrice}
                onChange={(e) => updateItemRow(index, 'unitPrice', e.target.value)}
              />
            </div>
            <div className="col-span-1 flex items-center">
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => removeItemRow(index)}
                >
                  ×
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
        <span className="font-medium text-foreground">Estimated total</span>
        <span className="font-semibold tabular-nums text-primary">
          {formatAmount(createGrandTotal)}
        </span>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Button
          className="w-full"
          disabled={isSubmitting}
          onClick={onCreateDraft}
        >
          {submitMode === 'draft' ? 'Saving draft…' : 'Save as Draft'}
        </Button>
        <Button
          className="w-full"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCreateAndSend}
        >
          {submitMode === 'send' ? (
            'Creating and sending…'
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Create &amp; Send
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (createOnly) {
    return (
      <AppLayout active="Quotations">
        <CreatePageLayout
          title="Create Quote"
          description="Draft a customer quotation with one or more line items. Send by email when the customer profile has an address on file."
          backTo="/quotations"
        >
          {quoteCreateForm}
        </CreatePageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout active="Quotations">
      <div className="space-y-6">
        <PageHeader
          title="Sales Quotations"
          description="Create and manage customer quotations"
        >
          <Button variant="outline" onClick={handleExportQuoteList}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            className="shadow-md"
            onClick={() => navigate('/quotations/new')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Quote
          </Button>
        </PageHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Quotes"
            value={stats.total}
            accent="bg-primary"
            icon={<FileText className="h-5 w-5 text-primary" />}
          />
          <KpiCard
            label="Sent"
            value={stats.sent}
            accent="bg-orange-400"
            icon={<Send className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
          />
          <KpiCard
            label="Accepted"
            value={stats.accepted}
            accent="bg-emerald-500"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          />
          <KpiCard
            label="Converted"
            value={stats.converted}
            accent="bg-sky-500"
            icon={<Repeat2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
          />
        </div>

        <Card className={uiSurfaces.pageCard}>
          <CardContent className="p-4 pt-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as QuoteTab)}>
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                  <TabsTrigger
                    value="all"
                    className="rounded-lg border border-transparent px-3 py-1.5 data-[state=active]:border-border data-[state=active]:bg-accent data-[state=active]:text-foreground"
                  >
                    All ({stats.total})
                  </TabsTrigger>
                  <TabsTrigger
                    value="draft"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-accent data-[state=active]:text-foreground"
                  >
                    Draft ({stats.draft})
                  </TabsTrigger>
                  <TabsTrigger
                    value="sent"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-accent data-[state=active]:text-foreground"
                  >
                    Sent ({stats.sent})
                  </TabsTrigger>
                  <TabsTrigger
                    value="user_requested"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-900"
                  >
                    Customer request ({stats.userRequested})
                  </TabsTrigger>
                  <TabsTrigger
                    value="accepted"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-accent data-[state=active]:text-foreground"
                  >
                    Accepted ({stats.accepted})
                  </TabsTrigger>
                  <TabsTrigger
                    value="converted"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-accent data-[state=active]:text-foreground"
                  >
                    Converted ({stats.converted})
                  </TabsTrigger>
                  <TabsTrigger
                    value="cancelled"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-muted data-[state=active]:text-foreground"
                  >
                    Cancelled ({stats.cancelled})
                  </TabsTrigger>
                </TabsList>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Search by quote number or customer…"
                    className="h-9 w-full min-w-[200px] text-sm sm:max-w-xs"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Select value={customerFilter} onValueChange={setCustomerFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-[180px]">
                      <SelectValue placeholder="Customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All customers</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.customerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value={tab} className="mt-0">
                <div className={uiSurfaces.tableShell}>
                  <Table>
                    <TableHeader>
                      <TableRow className={uiSurfaces.tableHeadRow}>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          Quote #
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          Customer
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          Amount
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          Valid Until
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          Status
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                            No quotations in this view.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((q) => {
                          const canConvert =
                            q.status === 'SENT' || q.status === 'ACCEPTED';
                          return (
                            <TableRow key={q.id} className={uiSurfaces.tableRow}>
                              <TableCell>
                                <button
                                  type="button"
                                  className="font-semibold text-primary hover:underline"
                                  onClick={() => openView(q)}
                                >
                                  {q.quoteNumber}
                                </button>
                              </TableCell>
                              <TableCell>{q.customer?.customerName ?? '—'}</TableCell>
                              <TableCell className="tabular-nums text-foreground">
                                <div>{formatAmount(q.totalValue)}</div>
                                {q.status === 'USER_REQUESTED' && q.customerRequestedTotal != null && (
                                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                                    Requested: {formatAmount(q.customerRequestedTotal)}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatQuoteDate(q.validUntil)}
                              </TableCell>
                              <TableCell>
                                <StatusPill status={q.status} />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="View details"
                                    onClick={() => openView(q)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {q.status === 'DRAFT' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-sky-700 dark:text-sky-300 hover:bg-sky-50"
                                      title="Send quote"
                                      disabled={sendQuote.isPending}
                                      onClick={() => onSend(q)}
                                    >
                                      <Send className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {q.status === 'SENT' && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        title="Mark accepted"
                                        disabled={acceptQuote.isPending}
                                        onClick={() => onAccept(q)}
                                      >
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        title="Cancel quotation"
                                        disabled={cancelQuote.isPending}
                                        onClick={() => onCancelQuote(q)}
                                      >
                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                    </>
                                  )}
                                  {q.status === 'USER_REQUESTED' && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-primary hover:bg-accent"
                                        title="Revise pricing and resend"
                                        onClick={() => openRevise(q)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        title="Cancel quotation"
                                        disabled={cancelQuote.isPending}
                                        onClick={() => onCancelQuote(q)}
                                      >
                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                    </>
                                  )}
                                  {canConvert && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
                                      title="Convert to sales order"
                                      disabled={convertQuote.isPending}
                                      onClick={() => onConvert(q)}
                                    >
                                      <Repeat2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {q.status === 'CONVERTED' && q.salesOrder && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="View sales order"
                                      onClick={() => navigate('/sales')}
                                    >
                                      <IndianRupee className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!viewQuote} onOpenChange={(open) => !open && setViewQuote(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          {viewQuote && (
            <>
              <SheetHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <SheetTitle className="flex flex-wrap items-center gap-2">
                      {viewQuote.quoteNumber}
                      <StatusPill status={viewQuote.status} />
                    </SheetTitle>
                    <SheetDescription>Quotation details and line items</SheetDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleExportQuoteDetail(viewQuote)}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </SheetHeader>

              <DocumentDetailActions
                kind="sales-quotation"
                id={viewQuote.id}
                canSend={viewQuote.status !== 'DRAFT' && viewQuote.status !== 'CANCELLED'}
                resend={viewQuote.status !== 'DRAFT'}
              />

              <div className="mt-6 space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-medium text-foreground">
                      {viewQuote.customer?.customerName ?? '—'}
                    </p>
                    {viewQuote.customer?.email ? (
                      <p className="text-xs text-muted-foreground">{viewQuote.customer.email}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quote date</p>
                    <p className="font-medium">{formatQuoteDate(viewQuote.quoteDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valid until</p>
                    <p className="font-medium">{formatQuoteDate(viewQuote.validUntil)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Grand total</p>
                    <p className="text-lg font-semibold tabular-nums text-primary">
                      {formatAmount(viewQuote.totalValue)}
                    </p>
                  </div>
                </div>

                {viewQuote.status === 'USER_REQUESTED' && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-900">
                    <p className="font-medium">Customer pricing request</p>
                    <p>
                      Target amount:{' '}
                      <strong>{formatAmount(viewQuote.customerRequestedTotal)}</strong>
                    </p>
                    {viewQuote.customerRequestNote ? (
                      <p className="mt-1 text-amber-800 dark:text-amber-300">{viewQuote.customerRequestNote}</p>
                    ) : null}
                  </div>
                )}

                {viewQuote.salesOrder && (
                  <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm">
                    <p className="text-xs text-primary">Linked sales order</p>
                    <button
                      type="button"
                      className="font-semibold text-primary hover:underline"
                      onClick={() => {
                        setViewQuote(null);
                        navigate('/sales');
                      }}
                    >
                      {viewQuote.salesOrder.soNumber}
                    </button>
                  </div>
                )}

                <div className="overflow-hidden rounded-lg border">
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
                      {(viewQuote.items ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                            No line items
                          </TableCell>
                        </TableRow>
                      ) : (
                        (viewQuote.items ?? []).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <p className="font-medium text-foreground">
                                {item.product?.productCode ?? '—'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.product?.description ?? ''}
                              </p>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{item.uom}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatAmount(item.unitPrice)}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatAmount(item.lineValue)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  {viewQuote.status === 'DRAFT' && (
                    <Button
                      className="bg-sky-600 hover:bg-sky-700"
                      disabled={sendQuote.isPending}
                      onClick={() => {
                        void onSend(viewQuote).then(() => setViewQuote(null));
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send to customer
                    </Button>
                  )}
                  {viewQuote.status === 'SENT' && (
                    <>
                      <Button
                        variant="outline"
                        disabled={acceptQuote.isPending}
                        onClick={() => {
                          void onAccept(viewQuote).then(() => setViewQuote(null));
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        Mark accepted
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={convertQuote.isPending}
                        onClick={() => {
                          void onConvert(viewQuote);
                          setViewQuote(null);
                        }}
                      >
                        <Repeat2 className="mr-2 h-4 w-4" />
                        Convert to order
                      </Button>
                      <Button
                        variant="outline"
                        disabled={cancelQuote.isPending}
                        onClick={() => {
                          void onCancelQuote(viewQuote).then(() => setViewQuote(null));
                        }}
                      >
                        Cancel quotation
                      </Button>
                    </>
                  )}
                  {viewQuote.status === 'ACCEPTED' && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={convertQuote.isPending}
                      onClick={() => {
                        void onConvert(viewQuote);
                        setViewQuote(null);
                      }}
                    >
                      <Repeat2 className="mr-2 h-4 w-4" />
                      Convert to order
                    </Button>
                  )}
                  {viewQuote.status === 'USER_REQUESTED' && (
                    <>
                      <Button
                        onClick={() => openRevise(viewQuote)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Revise &amp; resend
                      </Button>
                      <Button
                        variant="outline"
                        disabled={cancelQuote.isPending}
                        onClick={() => {
                          void onCancelQuote(viewQuote).then(() => setViewQuote(null));
                        }}
                      >
                        Cancel quotation
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={reviseOpen} onOpenChange={setReviseOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Revise &amp; resend quotation</SheetTitle>
            <SheetDescription>
              Adjust line prices to reflect the customer&apos;s request, then resend the updated
              quotation by email.
            </SheetDescription>
          </SheetHeader>
          {reviseTarget && (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-900">
                <p className="font-medium">{reviseTarget.quoteNumber}</p>
                <p>
                  Customer target:{' '}
                  <strong>{formatAmount(reviseTarget.customerRequestedTotal)}</strong>
                </p>
                {reviseTarget.customerRequestNote ? (
                  <p className="mt-1 text-amber-800 dark:text-amber-300">{reviseTarget.customerRequestNote}</p>
                ) : null}
              </div>
              <div className="space-y-3">
                {reviseLines.map((line, idx) => (
                  <div
                    key={`${line.productId}-${idx}`}
                    className="rounded-lg border border-border p-3"
                  >
                    <p className="text-sm font-medium text-foreground">{line.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty {line.quantity} {line.uom}
                    </p>
                    <div className="mt-2 space-y-1">
                      <Label className="text-xs">Unit price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={line.unitPrice}
                        onChange={(e) =>
                          setReviseLines((prev) =>
                            prev.map((l, i) =>
                              i === idx ? { ...l, unitPrice: e.target.value } : l,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                <span className="font-medium text-foreground">Revised total</span>
                <span className="font-semibold tabular-nums text-primary">
                  {formatAmount(reviseGrandTotal)}
                </span>
              </div>
              <Button
                className="w-full"
                disabled={updateQuote.isPending || resendQuote.isPending}
                onClick={onSaveAndResend}
              >
                <Send className="mr-2 h-4 w-4" />
                {updateQuote.isPending || resendQuote.isPending
                  ? 'Sending…'
                  : 'Save & resend to customer'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
