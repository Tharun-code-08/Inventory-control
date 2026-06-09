import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Send,
  FileText,
  Pencil,
  Monitor,
  CheckCircle2,
  Eye,
  Star,
  Trash2,
  Download,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog, CreatePageLayout, EmptyState, LoadingSkeleton, SearchInput } from '@/components/shared';
import { PageHeader } from '@/components/shared/page-header';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProducts, type Product } from '@/hooks/use-products';
import { useShops } from '@/hooks/use-shops';
import { useSuppliers } from '@/hooks/use-suppliers';
import {
  useRfqs,
  useCreateRfq,
  useSendRfq,
  useResendRfqInvites,
  useDeleteRfq,
  type Rfq,
} from '@/hooks/use-rfqs';
import { useQuotations } from '@/hooks/use-quotations';
import { useContracts } from '@/hooks/use-contracts';
import { useAuthStore } from '@/store/authStore';
import { useCookieConsentStore } from '@/store/cookieConsentStore';
import { cn } from '@/lib/cn';
import { getApiErrorMessage } from '@/lib/api-error';
import { resolvePreferredOrgId, syncPreferredOrgId } from '@/lib/cookie-consent';
import { csvDate, csvList, exportModuleCsv } from '@/lib/module-csv';
import { formatSupplierReference } from '@/lib/document-display';

type RfqTab = 'all' | 'draft' | 'sent' | 'responses' | 'completed';

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

function rfqStatusLabel(status: string): string {
  if (status === 'POSTED') return 'Sent';
  if (status === 'DRAFT') return 'Draft';
  return status;
}

function formatRfqDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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
        <div
          className={cn('w-1 self-stretch rounded-full', accent)}
          aria-hidden
        />
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

export function RfqsPage({ createOnly = false }: { createOnly?: boolean }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const functionalCookiesEnabled = useCookieConsentStore((state) => state.preferences.functional);
  const { data: shops = [] } = useShops();
  const { data: suppliers = [] } = useSuppliers();
  const { data: rfqs = [], isLoading } = useRfqs();
  const { data: quotations = [] } = useQuotations();
  const { data: contracts = [] } = useContracts();
  const createRfq = useCreateRfq();
  const sendRfq = useSendRfq();
  const resendInvites = useResendRfqInvites();
  const deleteRfq = useDeleteRfq();

  const [deleteTarget, setDeleteTarget] = useState<Rfq | null>(null);
  const [tab, setTab] = useState<RfqTab>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [pendingSupplierId, setPendingSupplierId] = useState('');
  const [form, setForm] = useState({
    title: '',
    deadline: '',
    notes: '',
    shopId: '',
    supplierIds: [] as string[],
  });
  const [items, setItems] = useState([
    { productId: '', quantity: '1', uom: 'UNIT', specifications: '' },
  ]);
  const [submitMode, setSubmitMode] = useState<'draft' | 'send' | null>(null);
  const isSubmitting = submitMode !== null;

  const resolvedShopId = resolvePreferredOrgId(
    shops.map((shop) => shop.id),
    user?.shopId,
    form.shopId,
  );
  const productsQuery = useProducts({
    companyCatalog: true,
    isActive: true,
    limit: 500,
    page: 1,
  });
  const products = useMemo(
    () => extractProductRows(productsQuery.data),
    [productsQuery.data],
  );
  const selectedSuppliers = useMemo(
    () => suppliers.filter((supplier) => form.supplierIds.includes(supplier.id)),
    [suppliers, form.supplierIds],
  );
  const availableSuppliers = useMemo(
    () => suppliers.filter((supplier) => !form.supplierIds.includes(supplier.id)),
    [suppliers, form.supplierIds],
  );

  const quotesByRfq = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of quotations) {
      const rfqId = (q as { rfqId?: string; rfq?: { id?: string } }).rfqId
        ?? (q as { rfq?: { id?: string } }).rfq?.id;
      if (rfqId) map.set(rfqId, (map.get(rfqId) ?? 0) + 1);
    }
    return map;
  }, [quotations]);

  const contractsByRfq = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contracts) {
      if (c.rfqId) map.set(c.rfqId, (map.get(c.rfqId) ?? 0) + 1);
    }
    return map;
  }, [contracts]);

  function rfqDeleteBlockReason(rfqId: string): string | null {
    const quotes = quotesByRfq.get(rfqId) ?? 0;
    if (quotes > 0) {
      return `${quotes} supplier quotation(s) must be removed first.`;
    }
    const linked = contractsByRfq.get(rfqId) ?? 0;
    if (linked > 0) {
      return `${linked} contract(s) are linked to this RFQ.`;
    }
    return null;
  }

  const stats = useMemo(() => {
    const draft = rfqs.filter((r) => r.status === 'DRAFT').length;
    const sent = rfqs.filter((r) => r.status === 'POSTED').length;
    const withResponses = rfqs.filter((r) => (quotesByRfq.get(r.id) ?? 0) > 0).length;
    return {
      total: rfqs.length,
      draft,
      sent,
      responses: withResponses,
      completed: withResponses,
    };
  }, [rfqs, quotesByRfq]);

  const filteredRfqs = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return rfqs.filter((r) => {
      if (tab === 'draft' && r.status !== 'DRAFT') return false;
      if (tab === 'sent' && r.status !== 'POSTED') return false;
      if (tab === 'responses' && (quotesByRfq.get(r.id) ?? 0) === 0) return false;
      if (tab === 'completed' && (quotesByRfq.get(r.id) ?? 0) === 0) return false;
      if (term) {
        const hay = `${r.rfqNumber} ${r.title}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rfqs, tab, debouncedSearch, quotesByRfq]);

  const isSearchPending = search !== debouncedSearch;

  const handleExportRfqs = () => {
    const ok = exportModuleCsv('rfqs.csv', filteredRfqs, [
      { header: 'RFQ Number', value: (rfq) => rfq.rfqNumber },
      { header: 'Title', value: (rfq) => rfq.title },
      { header: 'Status', value: (rfq) => rfqStatusLabel(rfq.status) },
      { header: 'RFQ Date', value: (rfq) => csvDate(rfq.rfqDate) },
      { header: 'Deadline', value: (rfq) => csvDate(rfq.deadline) },
      { header: 'Plant', value: (rfq) => rfq.shop?.shopName ?? '' },
      {
        header: 'Suppliers',
        value: (rfq) =>
          csvList(rfq.suppliers.map((entry) => formatSupplierReference(entry.supplier))),
      },
      { header: 'Items', value: (rfq) => rfq.items.length },
      { header: 'Quotations', value: (rfq) => quotesByRfq.get(rfq.id) ?? 0 },
      { header: 'Contracts', value: (rfq) => contractsByRfq.get(rfq.id) ?? 0 },
    ]);
    if (ok) toast.success('RFQ CSV exported');
    else toast.error('No RFQs to export');
  };

  useEffect(() => {
    if (user?.shopId || form.shopId || shops.length === 0) return;
    setForm((prev) => ({
      ...prev,
      shopId: resolvePreferredOrgId(
        shops.map((shop) => shop.id),
        user?.shopId,
        prev.shopId,
      ),
    }));
  }, [user?.shopId, form.shopId, shops]);

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
    setItems((prev) => [...prev, { productId: '', quantity: '1', uom: 'UNIT', specifications: '' }]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateItemRow = (
    index: number,
    key: 'productId' | 'quantity' | 'uom' | 'specifications',
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) return row;
        if (key === 'productId') {
          const selected = products.find((p) => p.id === value);
          return { ...row, productId: value, uom: selected?.uom || row.uom };
        }
        return { ...row, [key]: value };
      }),
    );
  };

  const resetCreateForm = () => {
    setForm({
      title: '',
      deadline: '',
      notes: '',
      shopId: user?.shopId ? form.shopId : resolvedShopId,
      supplierIds: [],
    });
    setPendingSupplierId('');
    setItems([{ productId: '', quantity: '1', uom: 'UNIT', specifications: '' }]);
  };

  const toggleSupplierSelection = (supplierId: string) => {
    setForm((prev) => ({
      ...prev,
      supplierIds: prev.supplierIds.includes(supplierId)
        ? prev.supplierIds.filter((id) => id !== supplierId)
        : [...prev.supplierIds, supplierId],
    }));
  };

  const addPendingSupplier = () => {
    if (!pendingSupplierId) {
      toast.error('Select a supplier first');
      return;
    }
    toggleSupplierSelection(pendingSupplierId);
    setPendingSupplierId('');
  };

  const buildCreatePayload = () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return null;
    }
    if (form.supplierIds.length === 0) {
      toast.error('Select at least one supplier');
      return null;
    }
    const normalizedItems = items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId,
        quantity: Math.max(1, Number(item.quantity || 1)),
        uom: item.uom || 'UNIT',
        specifications: item.specifications || undefined,
      }));
    if (normalizedItems.length === 0) {
      toast.error('Add at least one product');
      return null;
    }

    return {
      shopId: user?.shopId ?? shops[0]?.id ?? undefined,
      title: form.title.trim(),
      deadline: form.deadline || undefined,
      notes: form.notes || undefined,
      suppliers: form.supplierIds,
      items: normalizedItems,
    };
  };

  function toastEmailResult(
    rfqNumber: string,
    results: Array<{ email: string; status: string }> | undefined,
    label: string,
  ) {
    const sentTo = (results ?? [])
      .filter((r) => r.status === 'sent' && r.email)
      .map((r) => r.email);
    const sent = sentTo.length;
    const recipients = sentTo.length > 0 ? ` → ${sentTo.join(', ')}` : '';
    toast.success(
      `${rfqNumber} — portal link emailed to ${sent} supplier${sent === 1 ? '' : 's'}${recipients} (${label})`,
      { duration: 8000 },
    );
  }

  const finishCreateFlow = () => {
    if (createOnly) {
      navigate('/rfqs');
    }
    resetCreateForm();
  };

  const onCreateDraft = async () => {
    const payload = buildCreatePayload();
    if (!payload) return;

    setSubmitMode('draft');
    try {
      await createRfq.mutateAsync(payload);
      toast.success(
        `RFQ saved as draft for ${form.supplierIds.length} supplier${form.supplierIds.length === 1 ? '' : 's'}`,
      );
      finishCreateFlow();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save RFQ draft'));
    } finally {
      setSubmitMode(null);
    }
  };

  const onCreateAndSend = async () => {
    const payload = buildCreatePayload();
    if (!payload) return;

    setSubmitMode('send');
    try {
      const created = await createRfq.mutateAsync(payload);
      const result = await sendRfq.mutateAsync(created.id);
      toastEmailResult(created.rfqNumber, result.emailDelivery?.results, 'sent');
      finishCreateFlow();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to create and send RFQ'));
    } finally {
      setSubmitMode(null);
    }
  };

  const onSend = async (r: Rfq) => {
    try {
      const result = await sendRfq.mutateAsync(r.id);
      toastEmailResult(r.rfqNumber, result.emailDelivery?.results, 'sent');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to send RFQ'));
    }
  };

  const onResendInvites = async (r: Rfq) => {
    try {
      const result = await resendInvites.mutateAsync(r.id);
      toastEmailResult(r.rfqNumber, result.emailDelivery?.results, 'resent');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to resend invitations'));
    }
  };

  async function confirmDeleteRfq() {
    if (!deleteTarget) return;
    try {
      await deleteRfq.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.rfqNumber} deleted`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete RFQ'));
    }
  }

  const rfqCreateForm = (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Title *</Label>
          <Input
            className="h-9"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Deadline</Label>
          <Input
            type="date"
            className="h-9"
            value={form.deadline}
            onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Suppliers *</Label>
            <span className="text-[11px] text-slate-500">
              {form.supplierIds.length} selected
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Select value={pendingSupplierId} onValueChange={setPendingSupplierId}>
              <SelectTrigger className="h-9 flex-1 text-sm">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {availableSuppliers.length === 0 ? (
                  <SelectItem value="__all_selected__" disabled>
                    All suppliers already selected
                  </SelectItem>
                ) : (
                  availableSuppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.supplierName} ({supplier.supplierCode || supplier.id.slice(0, 8)})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4"
              disabled={!pendingSupplierId}
              onClick={addPendingSupplier}
            >
              Add
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">
            Select a supplier, then click Add. Each supplier will receive a separate RFQ email.
          </p>
          {selectedSuppliers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700"
                >
                  <span className="font-medium">
                    {supplier.supplierName} ({supplier.supplierCode})
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={`${supplier.id}-${index}`}
                        className={cn(
                          'h-3 w-3',
                          index < Math.round(supplier.rating)
                            ? 'fill-current text-amber-500'
                            : 'text-slate-300',
                        )}
                      />
                    ))}
                  </span>
                  <button
                    type="button"
                    className="rounded-full text-slate-500 transition hover:text-slate-800"
                    onClick={() => toggleSupplierSelection(supplier.id)}
                    aria-label={`Remove ${supplier.supplierName}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Notes</Label>
          <Input
            className="h-9"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </div>
      </div>

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
                min="1"
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
                className="h-8 text-xs"
                placeholder="Spec"
                value={item.specifications}
                onChange={(e) => updateItemRow(index, 'specifications', e.target.value)}
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

      <div className="flex flex-col gap-2 pt-1">
        <Button
          className="w-full"
          disabled={isSubmitting}
          onClick={onCreateDraft}
        >
          {submitMode === 'draft' ? 'Saving draft…' : 'Create as Draft'}
        </Button>
        <Button
          className="w-full"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCreateAndSend}
        >
          {submitMode === 'send' ? 'Confirming and sending…' : 'Confirm and send'}
        </Button>
      </div>
    </div>
  );

  if (createOnly) {
    return (
      <AppLayout active="RFQs">
        <CreatePageLayout
          title="Create RFQ"
          description="Draft a request for quotation and invite one or more suppliers. Each selected supplier receives a separate email when you send the RFQ."
          backTo="/rfqs"
        >
          {rfqCreateForm}
        </CreatePageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout active="RFQs">
      <div className="space-y-6">
        <PageHeader
          title="RFQ"
          description="Create quotation requests, invite suppliers, and collect portal responses."
        >
          <Button variant="outline" onClick={handleExportRfqs}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            className="shadow-md"
            onClick={() => navigate('/rfqs/new')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create RFQ
          </Button>
        </PageHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Total RFQs"
            value={stats.total}
            accent="bg-primary"
            icon={<FileText className="h-5 w-5 text-primary" />}
          />
          <KpiCard
            label="Draft"
            value={stats.draft}
            accent="bg-slate-400"
            icon={<Pencil className="h-5 w-5" />}
          />
          <KpiCard
            label="Sent"
            value={stats.sent}
            accent="bg-sky-500"
            icon={<Send className="h-5 w-5 text-sky-600" />}
          />
          <KpiCard
            label="Responses"
            value={stats.responses}
            accent="bg-violet-500"
            icon={<Monitor className="h-5 w-5 text-violet-600" />}
          />
          <KpiCard
            label="With quotes"
            value={stats.completed}
            accent="bg-emerald-500"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          />
        </div>

        <Card className="border-slate-200/90 shadow-sm">
          <CardContent className="p-4 pt-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as RfqTab)}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                    value="responses"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-accent data-[state=active]:text-foreground"
                  >
                    Responses ({stats.responses})
                  </TabsTrigger>
                </TabsList>
                <SearchInput
                  placeholder="Search RFQ number or title…"
                  value={search}
                  onChange={setSearch}
                  isSearching={isSearchPending || isLoading}
                  showNoResults={
                    !isLoading &&
                    !isSearchPending &&
                    search.trim().length > 0 &&
                    filteredRfqs.length === 0
                  }
                  noResultsMessage="No RFQs match your search."
                  className="max-w-xs"
                />
              </div>

              <TabsContent value={tab} className="mt-0">
                <div className="overflow-x-auto rounded-lg border">
                  {isLoading ? (
                    <div className="p-4">
                      <LoadingSkeleton rows={6} cols={9} />
                    </div>
                  ) : filteredRfqs.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title={search.trim() || tab !== 'all' ? 'No RFQs in this view' : 'No RFQs yet'}
                      description={
                        search.trim() || tab !== 'all'
                          ? 'Try another search or switch tabs.'
                          : 'Create your first request for quotation to invite supplier bids.'
                      }
                      action={
                        !search.trim() && tab === 'all' ? (
                          <Button onClick={() => navigate('/rfqs/new')}>
                            <Plus className="mr-2 h-4 w-4" />
                            New RFQ
                          </Button>
                        ) : undefined
                      }
                    />
                  ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80">
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          RFQ Number
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          Title
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wide">
                          Suppliers
                        </TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wide">
                          Responses
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          Status
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          Fulfillment
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          Deadline
                        </TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide">
                          Created
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRfqs.map((r) => {
                          const responseCount = quotesByRfq.get(r.id) ?? 0;
                          const deleteBlock = rfqDeleteBlockReason(r.id);
                          const supplierCount = r.suppliers?.length ?? 0;
                          const fulfillment = r.fulfillment;
                          return (
                            <TableRow key={r.id} className="hover:bg-slate-50/50">
                              <TableCell>
                                <button
                                  type="button"
                                  className="font-semibold text-primary hover:underline"
                                  onClick={() => navigate(`/rfqs/${r.id}`)}
                                >
                                  {r.rfqNumber}
                                </button>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">{r.title}</TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex min-w-[2rem] justify-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums">
                                  {supplierCount}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={cn(
                                    'inline-flex min-w-[2rem] justify-center rounded-md px-2 py-0.5 text-xs font-medium tabular-nums',
                                    responseCount > 0
                                      ? 'bg-muted text-primary'
                                      : 'bg-slate-100 text-slate-500',
                                  )}
                                >
                                  {responseCount}
                                </span>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={rfqStatusLabel(r.status)} />
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {fulfillment
                                  ? `${fulfillment.linesFullyOrdered}/${fulfillment.totalLines} lines · ${fulfillment.posCreated}/${fulfillment.maxPos} POs`
                                  : '—'}
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {formatRfqDate(r.deadline)}
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {formatRfqDate(r.rfqDate)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  {r.status === 'DRAFT' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={sendRfq.isPending}
                                      onClick={() => onSend(r)}
                                    >
                                      <Send className="mr-1 h-3.5 w-3.5" />
                                      Send
                                    </Button>
                                  )}
                                  {r.status === 'POSTED' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={resendInvites.isPending}
                                      onClick={() => onResendInvites(r)}
                                    >
                                      <Send className="mr-1 h-3.5 w-3.5" />
                                      Resend
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="View RFQ"
                                    onClick={() => navigate(`/rfqs/${r.id}`)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    title={deleteBlock ?? 'Delete RFQ'}
                                    disabled={Boolean(deleteBlock) || deleteRfq.isPending}
                                    onClick={() => setDeleteTarget(r)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete RFQ?"
        description={
          deleteTarget
            ? (() => {
                const block = rfqDeleteBlockReason(deleteTarget.id);
                if (block) return block;
                return `Permanently delete ${deleteTarget.rfqNumber} (${deleteTarget.title})? This cannot be undone.`;
              })()
            : ''
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteRfq.isPending}
        onConfirm={confirmDeleteRfq}
      />
    </AppLayout>
  );
}
