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
import { EmptyState, LoadingSkeleton, SearchInput, CreatePageLayout } from '@/components/shared';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
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
import { CustomerSearchSelect } from '@/components/sales/CustomerSearchSelect';
import { SalesOrderFulfillmentSection } from '@/components/sales/SalesOrderFulfillmentSection';
import { SalesOrderGstSummary } from '@/components/sales/SalesOrderGstSummary';
import {
  SalesOrderLineItemsEditor,
  emptySalesLine,
  type SalesLineDraft,
} from '@/components/sales/SalesOrderLineItemsEditor';
import type { Customer } from '@/hooks/use-customers';
import { resolveCustomerDeliveryAddress } from '@/lib/customer-address';
import { resolveGstSupplyType, supplyTypeLabel } from '@/lib/gst-supply-type';
import type { GstSupplyType } from '@/lib/gst-supply-type';
import {
  computeSalesLineGst,
  convertLinePercentsForSupplyType,
  splitTaxRateToPercents,
  validateLineGst,
} from '@/lib/sales-order-gst';
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
import { resolvePreferredOrgId } from '@/lib/cookie-consent';
import { cn } from '@/lib/cn';
import { getApiErrorMessage } from '@/lib/api-error';
import { csvDate, csvMoney, exportModuleCsv } from '@/lib/module-csv';

type SoTab = 'all' | 'draft' | 'confirmed' | 'fulfilled';

type OrderFormState = {
  customerId: string;
  quotationId: string;
  expectedDate: string;
  paymentTerms: string;
  deliveryAddress: string;
  notes: string;
  items: SalesLineDraft[];
};

const emptyForm = (): OrderFormState => ({
  customerId: '',
  quotationId: '',
  expectedDate: '',
  paymentTerms: 'Net 30',
  deliveryAddress: '',
  notes: '',
  items: [emptySalesLine()],
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
      ? 'bg-sky-100 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300'
      : status === 'FULFILLED'
        ? 'bg-muted text-foreground'
        : status === 'DRAFT'
          ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300'
          : 'bg-muted text-muted-foreground';

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
    <Card interactive className="group overflow-hidden border-border bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
      <CardContent className="flex items-center gap-3.5 p-4">
        <span className={cn('h-11 w-1.5 shrink-0 rounded-full', accent)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tabular-nums leading-tight tracking-tight text-foreground">{value}</p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-border transition-transform duration-300 group-hover:scale-105">
          {icon}
        </span>
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
        ? order.items.map((line) => {
            const isInter = order.gstSupplyType === 'INTER_STATE';
            const igstPercent = Number(line.igstRate ?? 0);
            const hasSplit = line.cgstRate != null || line.sgstRate != null;
            const { cgstPercent, sgstPercent } = hasSplit
              ? {
                  cgstPercent: Number(line.cgstRate ?? 0),
                  sgstPercent: Number(line.sgstRate ?? 0),
                }
              : splitTaxRateToPercents(Number(line.taxRate ?? 0));
            return {
              productId: line.productId,
              quantity: String(line.quantity),
              unitPrice: String(line.unitPrice),
              uom: line.uom ?? 'pcs',
              cgstPercent: String(isInter ? 0 : cgstPercent),
              sgstPercent: String(isInter ? 0 : sgstPercent),
              igstPercent: String(
                isInter ? igstPercent || cgstPercent + sgstPercent : igstPercent,
              ),
            };
          })
        : [emptySalesLine()],
  };
}

export function SalesPage({ createOnly = false }: { createOnly?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { data: shops = [] } = useShops();
  const { data: customers = [] } = useCustomers(undefined, { fetchAll: true });
  const { data: quotations = [] } = useSalesQuotations();
  const { data: salesOrders = [], isLoading } = useSalesOrders();
  const createOrder = useCreateSalesOrder();
  const updateOrder = useUpdateSalesOrder();
  const deleteOrder = useDeleteSalesOrder();
  const [tab, setTab] = useState<SoTab>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [customerFilter, setCustomerFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesOrder | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [useMasterAddress, setUseMasterAddress] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const resolvedShopId = resolvePreferredOrgId(
    shops.map((shop) => shop.id),
    user?.shopId,
    null,
  );
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
    const q = debouncedSearch.trim().toLowerCase();
    return salesOrders.filter((row) => {
      if (tab === 'draft' && row.status !== 'DRAFT') return false;
      if (tab === 'confirmed' && row.status !== 'CONFIRMED') return false;
      if (tab === 'fulfilled' && row.status !== 'FULFILLED') return false;
      if (customerFilter !== 'all' && row.customerId !== customerFilter) return false;
      if (!q) return true;
      const customer = row.customer?.customerName?.toLowerCase() ?? '';
      return row.soNumber.toLowerCase().includes(q) || customer.includes(q);
    });
  }, [salesOrders, tab, debouncedSearch, customerFilter]);

  const isSearchPending = search !== debouncedSearch || (isLoading && search.trim().length > 0);

  const resetForm = () => {
    setForm(emptyForm());
    setUseMasterAddress(true);
    setSelectedCustomer(null);
  };

  const activeShop = shops.find((s) => s.id === resolvedShopId);

  const gstSupplyType: GstSupplyType = useMemo(() => {
    const customer = selectedCustomer ?? customers.find((c) => c.id === form.customerId);
    return resolveGstSupplyType({
      shopTaxId: activeShop?.taxId,
      customerTaxId: customer?.taxId,
    });
  }, [activeShop?.taxId, selectedCustomer, customers, form.customerId]);

  const handleCustomerChange = (customerId: string, customer?: Customer) => {
    const resolved = customer ?? customers.find((c) => c.id === customerId) ?? null;
    setSelectedCustomer(resolved);
    const nextSupplyType = resolveGstSupplyType({
      shopTaxId: activeShop?.taxId,
      customerTaxId: resolved?.taxId,
    });
    setForm((prev) => ({
      ...prev,
      customerId,
      quotationId: '',
      deliveryAddress:
        useMasterAddress && customerId
          ? resolveCustomerDeliveryAddress(resolved)
          : prev.deliveryAddress,
      items: prev.items.map((line) => ({
        ...line,
        ...convertLinePercentsForSupplyType(line, nextSupplyType),
      })),
    }));
  };

  const handleDeliveryAddressChange = (value: string) => {
    setUseMasterAddress(false);
    setForm((prev) => ({ ...prev, deliveryAddress: value }));
  };

  const openCreate = () => {
    resetForm();
    setEditingId(null);
    navigate('/sales/new');
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
      if (editingOrder.customer) {
        setSelectedCustomer(editingOrder.customer as Customer);
      }
      setUseMasterAddress(false);
    }
  }, [editingOrder, editingId]);

  const openView = (order: SalesOrder) => {
    navigate(`/sales/${order.id}`);
  };

  const handleExportSalesOrders = () => {
    const ok = exportModuleCsv('sales-orders.csv', filtered, [
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
    const customer = customers.find((c) => c.id === quote.customerId);
    setSelectedCustomer(customer ?? null);
    setForm((prev) => ({
      ...prev,
      quotationId: quoteId,
      customerId: quote.customerId,
      expectedDate: quote.validUntil ? quote.validUntil.slice(0, 10) : prev.expectedDate,
      deliveryAddress: useMasterAddress
        ? resolveCustomerDeliveryAddress(customer)
        : prev.deliveryAddress,
      items: quote.items!.map((line) => ({
        productId: line.productId,
        quantity: String(line.quantity),
        unitPrice: String(line.unitPrice),
        uom: line.uom ?? 'pcs',
        cgstPercent: '9',
        sgstPercent: '9',
        igstPercent: '18',
      })),
    }));
  };

  const validateAndBuildPayload = (mode: 'create' | 'update') => {
    if (!form.customerId) {
      toast.error('Customer is required');
      return null;
    }
    if (mode === 'create' && !resolvedShopId) {
      toast.error('No plant available for this order');
      return null;
    }
    const activeLines = form.items.filter((line) => line.productId);
    for (const line of activeLines) {
      const gstError = validateLineGst(
        gstSupplyType,
        Number(line.cgstPercent),
        Number(line.sgstPercent),
        Number(line.igstPercent),
      );
      if (gstError) {
        toast.error(gstError);
        return null;
      }
    }
    const items = activeLines.map((line) => {
      const computed = computeSalesLineGst({
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        cgstPercent: Number(line.cgstPercent),
        sgstPercent: Number(line.sgstPercent),
        igstPercent: Number(line.igstPercent),
        supplyType: gstSupplyType,
      });
      return {
        productId: line.productId,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        uom: line.uom || 'pcs',
        cgstRate: Number(line.cgstPercent),
        sgstRate: Number(line.sgstPercent),
        igstRate: Number(line.igstPercent),
        taxRate: computed.taxRate,
      };
    });
    if (items.length === 0) {
      toast.error('Add at least one line item');
      return null;
    }
    const base = {
      customerId: form.customerId,
      expectedDate: form.expectedDate || undefined,
      remarks: buildRemarks(form),
      gstSupplyType,
      items,
    };
    if (mode === 'create') {
      return { ...base, shopId: resolvedShopId };
    }
    return base;
  };

  const onSave = async () => {
    const payload = validateAndBuildPayload(editingId ? 'update' : 'create');
    if (!payload) return;

    try {
      if (editingId) {
        await updateOrder.mutateAsync({ id: editingId, ...payload });
        toast.success('Sales order updated');
        setCreateOpen(false);
        setEditingId(null);
        resetForm();
      } else {
        await createOrder.mutateAsync(payload);
        toast.success('Sales order created');
        if (createOnly) {
          navigate('/sales');
        } else {
          setCreateOpen(false);
          setEditingId(null);
          resetForm();
        }
      }
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

  const closeCreateSheet = () => {
    const isFormDirty =
      form.customerId !== '' ||
      form.quotationId !== '' ||
      form.deliveryAddress !== '' ||
      form.notes !== '' ||
      form.items.some((it) => it.productId !== '' || Number(it.quantity) > 0);

    if (isFormDirty) {
      setCancelConfirmOpen(true);
    } else {
      setCreateOpen(false);
      setEditingId(null);
      resetForm();
    }
  };

  const activeCustomer =
    selectedCustomer ?? customers.find((c) => c.id === form.customerId) ?? null;

  const lineGstComputed = useMemo(
    () =>
      form.items
        .filter((line) => line.productId)
        .map((line) =>
          computeSalesLineGst({
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            cgstPercent: Number(line.cgstPercent),
            sgstPercent: Number(line.sgstPercent),
            igstPercent: Number(line.igstPercent),
            supplyType: gstSupplyType,
          }),
        ),
    [form.items, gstSupplyType],
  );

  const salesOrderForm = (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">Order Details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Customer *</Label>
            <CustomerSearchSelect
              value={form.customerId}
              onValueChange={handleCustomerChange}
            />
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
              <SelectTrigger className="h-9">
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
              className="h-9"
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
              <SelectTrigger className="h-9">
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

      <SalesOrderFulfillmentSection
        deliveryAddress={form.deliveryAddress}
        notes={form.notes}
        useMasterAddress={useMasterAddress}
        customer={activeCustomer}
        inputClassName="h-9"
        onDeliveryAddressChange={handleDeliveryAddressChange}
        onNotesChange={(notes) => setForm((p) => ({ ...p, notes }))}
        onUseMasterAddressChange={setUseMasterAddress}
      />

      <p className="text-xs font-medium text-muted-foreground">{supplyTypeLabel(gstSupplyType)}</p>

      <SalesOrderLineItemsEditor
        items={form.items}
        products={products}
        supplyType={gstSupplyType}
        formatAmount={formatAmount}
        compact
        scanShopId={resolvedShopId || undefined}
        onChange={(items) => setForm((p) => ({ ...p, items }))}
      />

      <SalesOrderGstSummary
        lines={lineGstComputed}
        supplyType={gstSupplyType}
        formatAmount={formatAmount}
      />

      <div className="flex flex-col gap-2 pt-1">
        <Button
          className="w-full"
          disabled={createOrder.isPending || updateOrder.isPending}
          onClick={onSave}
        >
          {createOrder.isPending ? 'Creating…' : 'Create Sales Order'}
        </Button>
      </div>
    </div>
  );

  if (createOnly) {
    return (
      <AppLayout active="Sales">
        <CreatePageLayout
          title="Create Sales Order"
          description="Draft a customer sales order with one or more line items."
          backTo="/sales"
        >
          {salesOrderForm}
        </CreatePageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout active="Sales">
      <div className="space-y-6">
        <PageHeader
          title="Sales Orders"
          description="Manage customer orders"
        >
          <Button variant="outline" onClick={handleExportSalesOrders}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create SO
          </Button>
        </PageHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard
            label="Total Orders"
            value={stats.total}
            accent="bg-primary"
            icon={<Truck className="h-5 w-5 text-primary" />}
          />
          <KpiCard
            label="Confirmed"
            value={stats.confirmed}
            accent="bg-emerald-500"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          />
          <KpiCard
            label="Revenue"
            value={formatAmount(stats.revenue)}
            accent="bg-sky-500"
            icon={<IndianRupee className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
          />
        </div>

        <Card className="border-border/90 shadow-sm">
          <CardContent className="p-4 pt-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as SoTab)}>
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
                    value="confirmed"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-accent data-[state=active]:text-foreground"
                  >
                    Confirmed ({stats.confirmed})
                  </TabsTrigger>
                  <TabsTrigger
                    value="fulfilled"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-accent data-[state=active]:text-foreground"
                  >
                    Fulfilled ({stats.fulfilled})
                  </TabsTrigger>
                </TabsList>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <SearchInput
                    placeholder="Search by SO number or customer…"
                    value={search}
                    onChange={setSearch}
                    isSearching={isSearchPending}
                    showNoResults={
                      !isLoading &&
                      !isSearchPending &&
                      search.trim().length > 0 &&
                      filtered.length === 0
                    }
                    noResultsMessage="No sales orders match your search."
                    className="w-full min-w-[200px] sm:max-w-xs"
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
                  {isLoading ? (
                    <div className="p-4">
                      <LoadingSkeleton rows={6} cols={7} />
                    </div>
                  ) : filtered.length === 0 ? (
                    <EmptyState
                      icon={Truck}
                      title={search.trim() || tab !== 'all' || customerFilter !== 'all' ? 'No sales orders in this view' : 'No sales orders yet'}
                      description={
                        search.trim() || tab !== 'all' || customerFilter !== 'all'
                          ? 'Try another search, customer filter, or tab.'
                          : 'Create your first sales order to start fulfilling customer demand.'
                      }
                      action={
                        !search.trim() && tab === 'all' && customerFilter === 'all' ? (
                          <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Sales Order
                          </Button>
                        ) : undefined
                      }
                    />
                  ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/80">
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
                      {filtered.map((so) => (
                          <TableRow key={so.id} className="hover:bg-muted/50">
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => openView(so)}
                                className="font-semibold text-primary hover:underline"
                              >
                                {so.soNumber}
                              </button>
                            </TableCell>
                            <TableCell>{so.customer?.customerName ?? '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {so.shop?.shopName ?? '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-foreground">
                              {formatAmount(so.totalValue)}
                            </TableCell>
                            <TableCell>
                              <StatusPill status={so.status} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatOrderDate(so.orderDate)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground"
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
                                      className="h-8 w-8 text-muted-foreground"
                                      aria-label="Edit"
                                      onClick={() => openEdit(so)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-50"
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
                        ))}
                    </TableBody>
                  </Table>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Edit draft */}
      <Sheet
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            closeCreateSheet();
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Edit Sales Order</SheetTitle>
            <SheetDescription>Update order details and line items</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <section className="space-y-4 rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground">Order Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <CustomerSearchSelect
                    value={form.customerId}
                    onValueChange={handleCustomerChange}
                  />
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

            <SalesOrderFulfillmentSection
              deliveryAddress={form.deliveryAddress}
              notes={form.notes}
              useMasterAddress={useMasterAddress}
              customer={activeCustomer}
              onDeliveryAddressChange={handleDeliveryAddressChange}
              onNotesChange={(notes) => setForm((p) => ({ ...p, notes }))}
              onUseMasterAddressChange={setUseMasterAddress}
            />

            <p className="text-xs font-medium text-muted-foreground">{supplyTypeLabel(gstSupplyType)}</p>

            <SalesOrderLineItemsEditor
              items={form.items}
              products={products}
              supplyType={gstSupplyType}
              formatAmount={formatAmount}
              scanShopId={resolvedShopId || undefined}
              onChange={(items) => setForm((p) => ({ ...p, items }))}
            />

            <SalesOrderGstSummary
              lines={lineGstComputed}
              supplyType={gstSupplyType}
              formatAmount={formatAmount}
            />

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={closeCreateSheet}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={createOrder.isPending || updateOrder.isPending}
                onClick={onSave}
              >
                {updateOrder.isPending ? 'Updating…' : 'Update SO'}
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

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={cancelConfirmOpen}
        onOpenChange={(open) => !open && setCancelConfirmOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              All the data you have entered will be lost. Are you sure you want to cancel?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setCancelConfirmOpen(false);
                setCreateOpen(false);
                setEditingId(null);
                resetForm();
              }}
            >
              Yes, discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
