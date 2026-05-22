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
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/shared/page-header';
import { ConfirmDialog } from '@/components/shared';
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
import { cn } from '@/lib/cn';
import { getApiErrorMessage } from '@/lib/api-error';

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

export function RfqsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data: shops = [] } = useShops();
  const { data: suppliers = [] } = useSuppliers();
  const { data: rfqs = [] } = useRfqs();
  const { data: quotations = [] } = useQuotations();
  const { data: contracts = [] } = useContracts();
  const createRfq = useCreateRfq();
  const sendRfq = useSendRfq();
  const resendInvites = useResendRfqInvites();
  const deleteRfq = useDeleteRfq();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Rfq | null>(null);
  const [tab, setTab] = useState<RfqTab>('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    title: '',
    deadline: '',
    notes: '',
    shopId: '',
    supplierId: '',
  });
  const [items, setItems] = useState([
    { productId: '', quantity: '1', uom: 'UNIT', specifications: '' },
  ]);

  const resolvedShopId = user?.shopId ?? form.shopId ?? shops[0]?.id ?? '';
  const productsQuery = useProducts({
    shopId: resolvedShopId || undefined,
    isActive: true,
    limit: 100,
    page: 1,
  });
  const products = useMemo(
    () => extractProductRows(productsQuery.data),
    [productsQuery.data],
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
    const term = search.trim().toLowerCase();
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
  }, [rfqs, tab, search, quotesByRfq]);

  useEffect(() => {
    if (user?.shopId || form.shopId || shops.length === 0) return;
    setForm((prev) => ({ ...prev, shopId: shops[0].id }));
  }, [user?.shopId, form.shopId, shops]);

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
      supplierId: '',
    });
    setItems([{ productId: '', quantity: '1', uom: 'UNIT', specifications: '' }]);
  };

  const onCreate = async () => {
    if (!resolvedShopId) {
      toast.error('Please select a plant');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.supplierId) {
      toast.error('Supplier is required');
      return;
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
      return;
    }

    try {
      await createRfq.mutateAsync({
        shopId: resolvedShopId,
        title: form.title.trim(),
        deadline: form.deadline || undefined,
        notes: form.notes || undefined,
        suppliers: [form.supplierId],
        items: normalizedItems,
      });
      toast.success('RFQ created');
      setCreateOpen(false);
      resetCreateForm();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Failed to create RFQ';
      toast.error(msg);
    }
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

  return (
    <AppLayout active="RFQs">
      <div className="space-y-6">
        <PageHeader
          title="RFQ"
          description="Create quotation requests, invite suppliers, and collect portal responses."
        >
          <Button
            className="bg-indigo-600 shadow-md hover:bg-indigo-700"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create RFQ
          </Button>
        </PageHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Total RFQs"
            value={stats.total}
            accent="bg-indigo-500"
            icon={<FileText className="h-5 w-5 text-indigo-600" />}
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
                    value="responses"
                    className="rounded-lg px-3 py-1.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-800"
                  >
                    Responses ({stats.responses})
                  </TabsTrigger>
                </TabsList>
                <Input
                  placeholder="Search RFQ number or title…"
                  className="h-9 max-w-xs text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <TabsContent value={tab} className="mt-0">
                <div className="overflow-x-auto rounded-lg border">
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
                      {filteredRfqs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="py-10 text-center text-slate-500">
                            No RFQs in this view.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRfqs.map((r) => {
                          const responseCount = quotesByRfq.get(r.id) ?? 0;
                          const deleteBlock = rfqDeleteBlockReason(r.id);
                          const supplierCount = r.suppliers?.length ?? 0;
                          return (
                            <TableRow key={r.id} className="hover:bg-slate-50/50">
                              <TableCell>
                                <button
                                  type="button"
                                  className="font-semibold text-indigo-700 hover:underline"
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
                                      ? 'bg-indigo-100 text-indigo-800'
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
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Create RFQ</SheetTitle>
            <SheetDescription>
              Draft a request for quotation and invite a supplier. Send it when ready so the portal
              link works.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
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
              {!user?.shopId && (
                <div className="space-y-1">
                  <Label className="text-xs">Plant *</Label>
                  <Select
                    value={form.shopId || resolvedShopId}
                    onValueChange={(value) => {
                      setForm((p) => ({ ...p, shopId: value }));
                      setItems([{ productId: '', quantity: '1', uom: 'UNIT', specifications: '' }]);
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Plant" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          {shop.shopName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Supplier *</Label>
                <Select
                  value={form.supplierId}
                  onValueChange={(value) => setForm((p) => ({ ...p, supplierId: value }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.supplierName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                            No products for this plant
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

            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={createRfq.isPending}
              onClick={onCreate}
            >
              {createRfq.isPending ? 'Creating…' : 'Create RFQ'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
