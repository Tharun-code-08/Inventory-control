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
    const source = raw as { items?: Product[]; data?: Product[] };
    if (Array.isArray(source.items)) return source.items;
    if (Array.isArray(source.data)) return source.data;
  }
  return [];
}

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
      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200'
      : status === 'USER_REQUESTED'
        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
        : status === 'ACCEPTED'
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
          : status === 'CONVERTED'
            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200'
            : status === 'CANCELLED'
              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';

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
    <Card className={cn('overflow-hidden', uiSurfaces.pageCard)}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('w-1 self-stretch rounded-full', accent)} aria-hidden />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuotationsPage() {
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

  const [createOpen, setCreateOpen] = useState(false);
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
    productId: '',
    quantity: '1',
    unitPrice: '0',
  });

  const resolvedShopId = resolvePreferredOrgId(
    shops.map((shop) => shop.id),
    user?.shopId,
    form.shopId,
  );
  const productsQuery = useProducts({
    shopId: resolvedShopId || undefined,
    isActive: true,
    limit: 100,
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
    setCreateOpen(false);
    setForm({
      customerId: '',
      validUntil: '',
      shopId: '',
      productId: '',
      quantity: '1',
      unitPrice: '0',
    });
  };

  useEffect(() => {
    syncPreferredOrgId(user?.shopId ? null : resolvedShopId, functionalCookiesEnabled);
  }, [functionalCookiesEnabled, resolvedShopId, user?.shopId]);

  const onCreate = async (andSend: boolean) => {
    if (!form.customerId || !form.productId) {
      toast.error('Select a customer and product.');
      return;
    }
    if (andSend && !selectedCustomer?.email?.trim()) {
      toast.error('Customer has no email. Add an email on the customer profile before sending.');
      return;
    }
    try {
      const created = await createQuote.mutateAsync({
        shopId: resolvedShopId || undefined,
        customerId: form.customerId,
        validUntil: form.validUntil || undefined,
        items: [
          {
            productId: form.productId,
            quantity: Number(form.quantity),
            unitPrice: Number(form.unitPrice),
            uom: 'UNIT',
          },
        ],
      });
      if (andSend) {
        const sent = await sendQuote.mutateAsync(created.id);
        toast.success(quotationSentToast(sent.emailDelivery), { duration: 8000 });
      } else {
        toast.success('Quotation created');
      }
      resetCreateForm();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, andSend ? 'Failed to create and send quotation' : 'Failed to create quotation'));
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
    const ok = exportModuleCsv('sales-quotations.csv', filteredQuotations, [
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
            className="bg-indigo-600 shadow-md hover:bg-indigo-700"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Quote
          </Button>
        </PageHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Quotes"
            value={stats.total}
            accent="bg-indigo-500"
            icon={<FileText className="h-5 w-5 text-indigo-600" />}
          />
          <KpiCard
            label="Sent"
            value={stats.sent}
            accent="bg-orange-400"
            icon={<Send className="h-5 w-5 text-orange-600" />}
          />
          <KpiCard
            label="Accepted"
            value={stats.accepted}
            accent="bg-emerald-500"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          />
          <KpiCard
            label="Converted"
            value={stats.converted}
            accent="bg-sky-500"
            icon={<Repeat2 className="h-5 w-5 text-sky-600" />}
          />
        </div>

        <Card className={uiSurfaces.pageCard}>
          <CardContent className="p-4 pt-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as QuoteTab)}>
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                  <TabsTrigger
                    value="all"
                    className="rounded-lg border border-transparent px-3 py-1.5 data-[state=active]:border-indigo-200 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-800"
                  >
                    All ({stats.total})
                  </TabsTrigger>
                  <TabsTrigger
                    value="draft"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-800"
                  >
                    Draft ({stats.draft})
                  </TabsTrigger>
                  <TabsTrigger
                    value="sent"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-800"
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
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-800"
                  >
                    Accepted ({stats.accepted})
                  </TabsTrigger>
                  <TabsTrigger
                    value="converted"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-800"
                  >
                    Converted ({stats.converted})
                  </TabsTrigger>
                  <TabsTrigger
                    value="cancelled"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-700"
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
                          <TableCell colSpan={6} className="py-10 text-center text-slate-500">
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
                                  className="font-semibold text-indigo-700 hover:underline"
                                  onClick={() => openView(q)}
                                >
                                  {q.quoteNumber}
                                </button>
                              </TableCell>
                              <TableCell>{q.customer?.customerName ?? '—'}</TableCell>
                              <TableCell className="tabular-nums text-slate-800">
                                <div>{formatAmount(q.totalValue)}</div>
                                {q.status === 'USER_REQUESTED' && q.customerRequestedTotal != null && (
                                  <p className="text-xs font-medium text-amber-800">
                                    Requested: {formatAmount(q.customerRequestedTotal)}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
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
                                      className="text-sky-700 hover:bg-sky-50"
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
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        title="Cancel quotation"
                                        disabled={cancelQuote.isPending}
                                        onClick={() => onCancelQuote(q)}
                                      >
                                        <XCircle className="h-4 w-4 text-slate-500" />
                                      </Button>
                                    </>
                                  )}
                                  {q.status === 'USER_REQUESTED' && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-indigo-700 hover:bg-indigo-50"
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
                                        <XCircle className="h-4 w-4 text-slate-500" />
                                      </Button>
                                    </>
                                  )}
                                  {canConvert && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-emerald-700 hover:bg-emerald-50"
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

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create Quote</SheetTitle>
            <SheetDescription>New customer quotation with at least one line.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {!user?.shopId && (
              <div className="space-y-2">
                <Label>Plant</Label>
                <Select
                  value={form.shopId || resolvedShopId}
                  onValueChange={(v) => {
                    setForm((p) => ({ ...p, shopId: v }));
                    syncPreferredOrgId(v, functionalCookiesEnabled);
                  }}
                >
                  <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={form.customerId}
                onValueChange={(v) => setForm((p) => ({ ...p, customerId: v }))}
              >
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Valid until</Label>
              <Input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select
                value={form.productId}
                onValueChange={(v) => {
                  const p = products.find((x) => x.id === v);
                  setForm((prev) => ({
                    ...prev,
                    productId: v,
                    unitPrice: String(p?.sellingPrice ?? p?.purchasePrice ?? 0),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.productCode} — {p.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0.001"
                  step="any"
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit price</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.unitPrice}
                  onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))}
                />
              </div>
            </div>
            {selectedCustomer && !selectedCustomer.email?.trim() && (
              <p className="text-xs text-amber-700">
                This customer has no email — add one under Customers before using Send.
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1"
                disabled={createQuote.isPending || sendQuote.isPending}
                onClick={() => onCreate(false)}
              >
                {createQuote.isPending ? 'Creating…' : 'Save as Draft'}
              </Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                disabled={createQuote.isPending || sendQuote.isPending}
                onClick={() => onCreate(true)}
              >
                {createQuote.isPending || sendQuote.isPending ? (
                  'Sending…'
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Create &amp; Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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

              <div className="mt-6 space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Customer</p>
                    <p className="font-medium text-slate-900">
                      {viewQuote.customer?.customerName ?? '—'}
                    </p>
                    {viewQuote.customer?.email ? (
                      <p className="text-xs text-slate-500">{viewQuote.customer.email}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Quote date</p>
                    <p className="font-medium">{formatQuoteDate(viewQuote.quoteDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Valid until</p>
                    <p className="font-medium">{formatQuoteDate(viewQuote.validUntil)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Grand total</p>
                    <p className="text-lg font-semibold tabular-nums text-indigo-800">
                      {formatAmount(viewQuote.totalValue)}
                    </p>
                  </div>
                </div>

                {viewQuote.status === 'USER_REQUESTED' && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <p className="font-medium">Customer pricing request</p>
                    <p>
                      Target amount:{' '}
                      <strong>{formatAmount(viewQuote.customerRequestedTotal)}</strong>
                    </p>
                    {viewQuote.customerRequestNote ? (
                      <p className="mt-1 text-amber-800">{viewQuote.customerRequestNote}</p>
                    ) : null}
                  </div>
                )}

                {viewQuote.salesOrder && (
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm">
                    <p className="text-xs text-indigo-600">Linked sales order</p>
                    <button
                      type="button"
                      className="font-semibold text-indigo-800 hover:underline"
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
                      <TableRow className="bg-slate-50">
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
                          <TableCell colSpan={5} className="py-6 text-center text-slate-500">
                            No line items
                          </TableCell>
                        </TableRow>
                      ) : (
                        (viewQuote.items ?? []).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <p className="font-medium text-slate-900">
                                {item.product?.productCode ?? '—'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {item.product?.description ?? ''}
                              </p>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-slate-600">{item.uom}</TableCell>
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

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
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
                        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
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
                        className="bg-indigo-600 hover:bg-indigo-700"
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
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p className="font-medium">{reviseTarget.quoteNumber}</p>
                <p>
                  Customer target:{' '}
                  <strong>{formatAmount(reviseTarget.customerRequestedTotal)}</strong>
                </p>
                {reviseTarget.customerRequestNote ? (
                  <p className="mt-1 text-amber-800">{reviseTarget.customerRequestNote}</p>
                ) : null}
              </div>
              <div className="space-y-3">
                {reviseLines.map((line, idx) => (
                  <div
                    key={`${line.productId}-${idx}`}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <p className="text-sm font-medium text-slate-900">{line.label}</p>
                    <p className="text-xs text-slate-500">
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
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-700">Revised total</span>
                <span className="font-semibold tabular-nums text-indigo-800">
                  {formatAmount(reviseGrandTotal)}
                </span>
              </div>
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700"
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
