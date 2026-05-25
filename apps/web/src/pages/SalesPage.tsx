import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Download,
  Eye,
  IndianRupee,
  Pencil,
  Plus,
  Trash2,
  Truck,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCustomers } from '@/hooks/use-customers';
import { useProducts, type Product } from '@/hooks/use-products';
import { useShops } from '@/hooks/use-shops';
import { useSalesQuotations } from '@/hooks/use-sales-quotations';
import {
  useSalesOrders,
  useSalesOrder,
  useCreateSalesOrder,
  useUpdateSalesOrder,
  useDeleteSalesOrder,
  type SalesOrder,
} from '@/hooks/use-sales-orders';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/cn';
import { getApiErrorMessage } from '@/lib/api-error';
import { csvDate, csvMoney, exportModuleCsv } from '@/lib/module-csv';

type SoTab = 'all' | 'draft' | 'confirmed' | 'fulfilled';

type LineDraft = {
  productId: string;
  quantity: string;
  unitPrice: string;
  uom: string;
};

type OrderFormState = {
  customerId: string;
  quotationId: string;
  expectedDate: string;
  paymentTerms: string;
  deliveryAddress: string;
  notes: string;
  items: LineDraft[];
};

const emptyLine = (): LineDraft => ({
  productId: '',
  quantity: '1',
  unitPrice: '0',
  uom: 'pcs',
});

const emptyForm = (): OrderFormState => ({
  customerId: '',
  quotationId: '',
  expectedDate: '',
  paymentTerms: 'Net 30',
  deliveryAddress: '',
  notes: '',
  items: [emptyLine()],
});

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

function formatOrderDate(value?: string | null): string {
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

function buildRemarks(form: OrderFormState): string | undefined {
  const parts = [
    form.paymentTerms.trim() ? `Payment terms: ${form.paymentTerms.trim()}` : '',
    form.deliveryAddress.trim() ? `Delivery: ${form.deliveryAddress.trim()}` : '',
    form.notes.trim(),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('\n') : undefined;
}

function statusLabel(status: string): string {
  if (status === 'DRAFT') return 'Draft';
  if (status === 'CONFIRMED') return 'Confirmed';
  if (status === 'FULFILLED') return 'Fulfilled';
  if (status === 'CLOSED') return 'Closed';
  if (status === 'CANCELLED') return 'Cancelled';
  return status;
}

function StatusPill({ status }: { status: string }) {
  const label = statusLabel(status);
  const styles =
    status === 'CONFIRMED'
      ? 'bg-sky-100 text-sky-800'
      : status === 'FULFILLED'
        ? 'bg-slate-100 text-slate-700'
        : status === 'DRAFT'
          ? 'bg-amber-50 text-amber-800'
          : 'bg-slate-100 text-slate-600';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {label}
    </span>
  );
}

type KpiCardProps = {
  label: string;
  value: string | number;
  accent: string;
  icon: React.ReactNode;
};

function KpiCard({ label, value, accent, icon }: KpiCardProps) {
  return (
    <Card className="overflow-hidden border-slate-200/90 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('w-1 self-stretch rounded-full', accent)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function orderToForm(order: SalesOrder): OrderFormState {
  const remarks = order.remarks ?? '';
  let paymentTerms = 'Net 30';
  let deliveryAddress = '';
  let notes = remarks;
  const payMatch = remarks.match(/Payment terms:\s*(.+)/i);
  const delMatch = remarks.match(/Delivery:\s*(.+)/i);
  if (payMatch) paymentTerms = payMatch[1].split('\n')[0].trim();
  if (delMatch) deliveryAddress = delMatch[1].split('\n')[0].trim();
  if (payMatch || delMatch) {
    notes = remarks
      .replace(/Payment terms:\s*.+/i, '')
      .replace(/Delivery:\s*.+/i, '')
      .trim();
  }

  return {
    customerId: order.customerId,
    quotationId: order.salesQuotation?.id ?? '',
    expectedDate: order.expectedDate ? order.expectedDate.slice(0, 10) : '',
    paymentTerms,
    deliveryAddress,
    notes,
    items:
      order.items && order.items.length > 0
        ? order.items.map((line) => ({
            productId: line.productId,
            quantity: String(line.quantity),
            unitPrice: String(line.unitPrice),
            uom: line.uom ?? 'pcs',
          }))
        : [emptyLine()],
  };
}

export function SalesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { data: shops = [] } = useShops();
  const { data: customers = [] } = useCustomers();
  const { data: quotations = [] } = useSalesQuotations();
  const { data: salesOrders = [], isLoading } = useSalesOrders();
  const createOrder = useCreateSalesOrder();
  const updateOrder = useUpdateSalesOrder();
  const deleteOrder = useDeleteSalesOrder();
  const [tab, setTab] = useState<SoTab>('all');
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesOrder | null>(null);
  const [form, setForm] = useState(emptyForm());

  const resolvedShopId = user?.shopId ?? shops[0]?.id ?? '';
  const productsQuery = useProducts({
    shopId: resolvedShopId || undefined,
    isActive: true,
    limit: 100,
    page: 1,
  });
  const products = useMemo(() => extractProductRows(productsQuery.data), [productsQuery.data]);

  const { data: editingOrder } = useSalesOrder(editingId ?? '', !!editingId);

  useEffect(() => {
    const editOrderId = (location.state as { editOrderId?: string } | null)?.editOrderId;
    if (editOrderId) {
      setEditingId(editOrderId);
      setCreateOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const stats = useMemo(() => {
    const total = salesOrders.length;
    const confirmed = salesOrders.filter((o) => o.status === 'CONFIRMED').length;
    const revenue = salesOrders.reduce((sum, o) => sum + Number(o.totalValue ?? 0), 0);
    const draft = salesOrders.filter((o) => o.status === 'DRAFT').length;
    const fulfilled = salesOrders.filter((o) => o.status === 'FULFILLED').length;
    return { total, confirmed, revenue, draft, fulfilled };
  }, [salesOrders]);

  const customerQuotes = useMemo(() => {
    if (!form.customerId) return [];
    return quotations.filter(
      (q) =>
        q.customerId === form.customerId &&
        (q.status === 'SENT' || q.status === 'ACCEPTED' || q.status === 'CONVERTED'),
    );
  }, [quotations, form.customerId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return salesOrders.filter((row) => {
      if (tab === 'draft' && row.status !== 'DRAFT') return false;
      if (tab === 'confirmed' && row.status !== 'CONFIRMED') return false;
      if (tab === 'fulfilled' && row.status !== 'FULFILLED') return false;
      if (customerFilter !== 'all' && row.customerId !== customerFilter) return false;
      if (!q) return true;
      const customer = row.customer?.customerName?.toLowerCase() ?? '';
      return row.soNumber.toLowerCase().includes(q) || customer.includes(q);
    });
  }, [salesOrders, tab, search, customerFilter]);

  const resetForm = () => setForm(emptyForm());

  const openCreate = () => {
    resetForm();
    setEditingId(null);
    setCreateOpen(true);
  };

  const openEdit = (order: SalesOrder) => {
    if (order.status !== 'DRAFT') {
      toast.error('Only draft sales orders can be edited');
      return;
    }
    setEditingId(order.id);
    setCreateOpen(true);
  };

  useEffect(() => {
    if (editingOrder && editingId) {
      setForm(orderToForm(editingOrder));
    }
  }, [editingOrder, editingId]);

  const openView = (order: SalesOrder) => {
    navigate(`/sales/${order.id}`);
  };

  const handleExportSalesOrders = () => {
    const ok = exportModuleCsv('sales-orders.csv', filteredOrders, [
      { header: 'SO Number', value: (order) => order.soNumber },
      { header: 'Order Date', value: (order) => csvDate(order.orderDate) },
      { header: 'Expected Date', value: (order) => csvDate(order.expectedDate) },
      { header: 'Customer', value: (order) => order.customer?.customerName ?? '' },
      { header: 'Plant', value: (order) => order.shop?.shopName ?? '' },
      { header: 'Status', value: (order) => statusLabel(order.status) },
      { header: 'Quotation', value: (order) => order.salesQuotation?.quoteNumber ?? '' },
      { header: 'Items', value: (order) => order.items?.length ?? 0 },
      { header: 'Order Qty', value: (order) => order.items?.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0) ?? 0 },
      { header: 'Total Value', value: (order) => csvMoney(order.totalValue) },
    ]);
    if (ok) toast.success('Sales orders exported');
    else toast.error('No sales orders to export');
  };

  const applyQuotation = (quoteId: string) => {
    const quote = quotations.find((q) => q.id === quoteId);
    if (!quote?.items?.length) return;
    setForm((prev) => ({
      ...prev,
      quotationId: quoteId,
      customerId: quote.customerId,
      expectedDate: quote.validUntil ? quote.validUntil.slice(0, 10) : prev.expectedDate,
      items: quote.items!.map((line) => ({
        productId: line.productId,
        quantity: String(line.quantity),
        unitPrice: String(line.unitPrice),
        uom: line.uom ?? 'pcs',
      })),
    }));
  };

  const validateAndBuildPayload = () => {
    if (!form.customerId) {
      toast.error('Customer is required');
      return null;
    }
    if (!resolvedShopId) {
      toast.error('No plant available for this order');
      return null;
    }
    const items = form.items
      .filter((line) => line.productId)
      .map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        uom: line.uom || 'pcs',
      }));
    if (items.length === 0) {
      toast.error('Add at least one line item');
      return null;
    }
    return {
      shopId: resolvedShopId,
      customerId: form.customerId,
      expectedDate: form.expectedDate || undefined,
      remarks: buildRemarks(form),
      items,
    };
  };

  const onSave = async () => {
    const payload = validateAndBuildPayload();
    if (!payload) return;

    try {
      if (editingId) {
        await updateOrder.mutateAsync({ id: editingId, ...payload });
        toast.success('Sales order updated');
      } else {
        await createOrder.mutateAsync(payload);
        toast.success('Sales order created');
      }
      setCreateOpen(false);
      setEditingId(null);
      resetForm();
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, editingId ? 'Failed to update sales order' : 'Failed to create sales order'),
      );
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteOrder.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.soNumber} deleted`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete sales order'));
    }
  };

  const sheetMode = editingId ? 'edit' : 'create';

  return (
    <AppLayout active="Sales">
      <div className="space-y-6">
        <PageHeader title="Sales Orders" description="Manage customer orders">
          <Button variant="outline" onClick={handleExportSalesOrders}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create SO
          </Button>
        </PageHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard
            label="Total Orders"
            value={stats.total}
            accent="bg-indigo-500"
            icon={<Truck className="h-5 w-5 text-indigo-600" />}
          />
          <KpiCard
            label="Confirmed"
            value={stats.confirmed}
            accent="bg-emerald-500"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          />
          <KpiCard
            label="Revenue"
            value={formatAmount(stats.revenue)}
            accent="bg-sky-500"
            icon={<IndianRupee className="h-5 w-5 text-sky-600" />}
          />
        </div>

        <Card className="border-slate-200/90 shadow-sm">
          <CardContent className="p-4 pt-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as SoTab)}>
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
                    value="confirmed"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-800"
                  >
                    Confirmed ({stats.confirmed})
                  </TabsTrigger>
                  <TabsTrigger
                    value="fulfilled"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-800"
                  >
                    Fulfilled ({stats.fulfilled})
                  </TabsTrigger>
                </TabsList>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Search by SO number or customer…"
                    className="h-9 w-full min-w-[200px] text-sm sm:max-w-xs"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Select value={customerFilter} onValueChange={setCustomerFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-[180px]">
                      <SelectValue placeholder="Customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
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
                          SO Number
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          Customer
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          Plant
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                          Amount
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          Status
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          Date
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                            Loading sales orders…
                          </TableCell>
                        </TableRow>
                      ) : filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                            No sales orders in this view.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((so) => (
                          <TableRow key={so.id} className="hover:bg-slate-50/50">
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => openView(so)}
                                className="font-semibold text-indigo-700 hover:underline"
                              >
                                {so.soNumber}
                              </button>
                            </TableCell>
                            <TableCell>{so.customer?.customerName ?? '—'}</TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {so.shop?.shopName ?? '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-slate-800">
                              {formatAmount(so.totalValue)}
                            </TableCell>
                            <TableCell>
                              <StatusPill status={so.status} />
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {formatOrderDate(so.orderDate)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-slate-500"
                                  aria-label="View"
                                  onClick={() => openView(so)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {so.status === 'DRAFT' && (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-slate-500"
                                      aria-label="Edit"
                                      onClick={() => openEdit(so)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-red-600 hover:bg-red-50"
                                      aria-label="Delete"
                                      onClick={() => setDeleteTarget(so)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit */}
      <Sheet
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setEditingId(null);
            resetForm();
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{sheetMode === 'edit' ? 'Edit Sales Order' : 'Create Sales Order'}</SheetTitle>
            <SheetDescription>Order details and line items</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <section className="space-y-4 rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Order Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select
                    value={form.customerId}
                    onValueChange={(v) => setForm((p) => ({ ...p, customerId: v, quotationId: '' }))}
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
                  <Label>Sales Quotation Ref</Label>
                  <Select
                    value={form.quotationId || 'none'}
                    onValueChange={(v) => {
                      if (v === 'none') {
                        setForm((p) => ({ ...p, quotationId: '' }));
                        return;
                      }
                      applyQuotation(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {customerQuotes.map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.quoteNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Delivery Date</Label>
                  <Input
                    type="date"
                    value={form.expectedDate}
                    onChange={(e) => setForm((p) => ({ ...p, expectedDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select
                    value={form.paymentTerms}
                    onValueChange={(v) => setForm((p) => ({ ...p, paymentTerms: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                      <SelectItem value="COD">COD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Fulfillment Location</h3>
              <div className="space-y-2">
                <Label>Customer Delivery Address</Label>
                <Input
                  value={form.deliveryAddress}
                  onChange={(e) => setForm((p) => ({ ...p, deliveryAddress: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Line Items</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setForm((p) => ({ ...p, items: [...p.items, emptyLine()] }))}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Item
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs">Qty</TableHead>
                      <TableHead className="text-xs">Unit Price</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-slate-500">
                          No items added
                        </TableCell>
                      </TableRow>
                    ) : (
                      form.items.map((line, index) => {
                        const product = products.find((p) => p.id === line.productId);
                        const lineTotal =
                          Number(line.quantity || 0) * Number(line.unitPrice || 0);
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <Select
                                value={line.productId || 'none'}
                                onValueChange={(v) => {
                                  if (v === 'none') return;
                                  const p = products.find((x) => x.id === v);
                                  setForm((prev) => ({
                                    ...prev,
                                    items: prev.items.map((row, i) =>
                                      i === index
                                        ? {
                                            ...row,
                                            productId: v,
                                            unitPrice: String(p?.sellingPrice ?? row.unitPrice),
                                            uom: p?.uom ?? row.uom,
                                          }
                                        : row,
                                    ),
                                  }));
                                }}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Product" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Select…</SelectItem>
                                  {products.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.productCode} — {p.description}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {product && (
                                <p className="mt-1 text-xs text-slate-500">{product.description}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0.0001"
                                className="h-8 w-20"
                                value={line.quantity}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    items: prev.items.map((row, i) =>
                                      i === index ? { ...row, quantity: e.target.value } : row,
                                    ),
                                  }))
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                className="h-8 w-24"
                                value={line.unitPrice}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    items: prev.items.map((row, i) =>
                                      i === index ? { ...row, unitPrice: e.target.value } : row,
                                    ),
                                  }))
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm">
                              {formatAmount(lineTotal)}
                            </TableCell>
                            <TableCell>
                              {form.items.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600"
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      items: prev.items.filter((_, i) => i !== index),
                                    }))
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setCreateOpen(false);
                  setEditingId(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                disabled={createOrder.isPending || updateOrder.isPending}
                onClick={onSave}
              >
                {sheetMode === 'edit' ? 'Update SO' : 'Create SO'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sales order</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete draft order{' '}
              <span className="font-medium text-foreground">{deleteTarget?.soNumber}</span>? This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteOrder.isPending}
              onClick={onDelete}
            >
              {deleteOrder.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
