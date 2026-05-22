import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Send,
  FileText,
  CheckCircle2,
  Repeat2,
  Eye,
  IndianRupee,
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
  type SalesQuotation,
} from '@/hooks/use-sales-quotations';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';
import { getApiErrorMessage } from '@/lib/api-error';

type QuoteTab = 'all' | 'draft' | 'sent' | 'accepted' | 'converted';

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
  return status;
}

function StatusPill({ status }: { status: string }) {
  const label = statusLabel(status);
  const styles =
    status === 'SENT'
      ? 'bg-sky-100 text-sky-800'
      : status === 'ACCEPTED'
        ? 'bg-slate-100 text-slate-700'
        : status === 'CONVERTED'
          ? 'bg-indigo-100 text-indigo-800'
          : 'bg-amber-50 text-amber-800';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles,
      )}
    >
      {status === 'SENT' && <Send className="h-3 w-3" />}
      {status === 'ACCEPTED' && <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />}
      {status === 'CONVERTED' && <Repeat2 className="h-3 w-3" />}
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
    <Card className="overflow-hidden border-slate-200/90 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('w-1 self-stretch rounded-full', accent)} aria-hidden />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuotationsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: shops = [] } = useShops();
  const { data: customers = [] } = useCustomers();
  const { data: quotations = [] } = useSalesQuotations();
  const createQuote = useCreateSalesQuotation();
  const sendQuote = useSendSalesQuotation();
  const acceptQuote = useAcceptSalesQuotation();
  const convertQuote = useConvertSalesQuotationToOrder();

  const [createOpen, setCreateOpen] = useState(false);
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

  const resolvedShopId = user?.shopId ?? form.shopId ?? shops[0]?.id ?? '';
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
    const accepted = quotations.filter((q) => q.status === 'ACCEPTED').length;
    const converted = quotations.filter((q) => q.status === 'CONVERTED').length;
    return { total: quotations.length, draft, sent, accepted, converted };
  }, [quotations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotations.filter((row) => {
      if (tab === 'draft' && row.status !== 'DRAFT') return false;
      if (tab === 'sent' && row.status !== 'SENT') return false;
      if (tab === 'accepted' && row.status !== 'ACCEPTED') return false;
      if (tab === 'converted' && row.status !== 'CONVERTED') return false;
      if (customerFilter !== 'all' && row.customerId !== customerFilter) return false;
      if (!q) return true;
      const customer = row.customer?.customerName?.toLowerCase() ?? '';
      return row.quoteNumber.toLowerCase().includes(q) || customer.includes(q);
    });
  }, [quotations, tab, search, customerFilter]);

  const onCreate = async () => {
    if (!form.customerId || !form.productId) {
      toast.error('Select a customer and product.');
      return;
    }
    try {
      await createQuote.mutateAsync({
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
      toast.success('Quotation created');
      setCreateOpen(false);
      setForm({
        customerId: '',
        validUntil: '',
        shopId: '',
        productId: '',
        quantity: '1',
        unitPrice: '0',
      });
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to create quotation'));
    }
  };

  async function onSend(q: SalesQuotation) {
    try {
      await sendQuote.mutateAsync(q.id);
      toast.success(`${q.quoteNumber} sent`);
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

  return (
    <AppLayout active="Quotations">
      <div className="space-y-6">
        <PageHeader
          title="Sales Quotations"
          description="Create and manage customer quotations"
        >
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

        <Card className="border-slate-200/90 shadow-sm">
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
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80">
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
                            <TableRow key={q.id} className="hover:bg-slate-50/50">
                              <TableCell>
                                <span className="font-semibold text-indigo-700">
                                  {q.quoteNumber}
                                </span>
                              </TableCell>
                              <TableCell>{q.customer?.customerName ?? '—'}</TableCell>
                              <TableCell className="tabular-nums text-slate-800">
                                {formatAmount(q.totalValue)}
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
                                    title="View"
                                    onClick={() => toast.info(`${q.quoteNumber} — ${q.items?.length ?? 0} line(s)`)}
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
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="Mark accepted"
                                      disabled={acceptQuote.isPending}
                                      onClick={() => onAccept(q)}
                                    >
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    </Button>
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
                  onValueChange={(v) => setForm((p) => ({ ...p, shopId: v }))}
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
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={createQuote.isPending}
              onClick={onCreate}
            >
              {createQuote.isPending ? 'Creating…' : 'Create Quote'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
