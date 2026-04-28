import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Trash2,
  Eye,
  Pencil,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  ArrowRightFromLine,
  ClipboardList,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader, SearchInput, ConfirmDialog, DataTablePagination, LoadingSkeleton, EmptyState } from '@/components/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

import {
  usePurchaseOrders,
  usePurchaseOrder,
  useCreatePurchaseOrder,
  useConfirmPurchaseOrder,
  useCancelPurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from '@/hooks/use-purchase-orders';
import { useProducts, type Product } from '@/hooks/use-products';
import { useRfqs } from '@/hooks/use-rfqs';
import { useContracts } from '@/hooks/use-contracts';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useShops } from '@/hooks/use-shops';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const poItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  currentStock: z.coerce.number().min(0),
  minStock: z.coerce.number().min(0),
  suggestedQty: z.coerce.number().min(0),
  orderQty: z.coerce.number().positive('Order qty must be > 0'),
  rate: z.coerce.number().positive('Rate must be > 0'),
});

const poFormSchema = z.object({
  poDate: z.string().min(1, 'Date is required'),
  supplier: z.string().min(1, 'Supplier is required'),
  remarks: z.string().optional(),
  items: z.array(poItemSchema).min(1, 'Add at least one item'),
});

type POFormValues = z.infer<typeof poFormSchema>;

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [selectedShopId, setSelectedShopId] = useState('');
  const { data: shops = [] } = useShops();
  const shopId = user?.shopId ?? selectedShopId;
  const [sourceType, setSourceType] = useState<'DIRECT' | 'RFQ' | 'CONTRACT'>('DIRECT');
  const [sourceRfqId, setSourceRfqId] = useState('');
  const [sourceContractId, setSourceContractId] = useState('');

  // ---- list filters ----
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | PurchaseOrderStatus>('');
  const [page, setPage] = useState(1);

  // ---- UI state ----
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: 'confirm' | 'cancel'; id: string; poNumber: string } | null>(null);

  // ---- queries ----
  const poQuery = usePurchaseOrders({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter || undefined,
    shopId: shopId || undefined,
  });

  const poList = useMemo(() => {
    const raw = poQuery.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as PurchaseOrder[];
    if (typeof raw === 'object' && 'rows' in raw) return (raw as { rows: PurchaseOrder[] }).rows;
    if (typeof raw === 'object' && 'data' in raw) return (raw as { data: PurchaseOrder[] }).data;
    return [];
  }, [poQuery.data]);

  const poTotal = useMemo(() => {
    const raw = poQuery.data;
    if (!raw || Array.isArray(raw)) return undefined;
    if (typeof raw === 'object' && 'total' in raw) return (raw as { total: number }).total;
    if (typeof raw === 'object' && 'meta' in raw) return (raw as { meta: { total: number } }).meta.total;
    return undefined;
  }, [poQuery.data]);

  const detailQuery = usePurchaseOrder(detailId ?? '');
  const detailPO = detailId ? detailQuery.data : null;

  const productsQuery = useProducts({ shopId: shopId || undefined, isActive: true, limit: 500 });
  const { data: rfqs = [] } = useRfqs();
  const { data: contracts = [] } = useContracts();
  const { data: suppliers = [] } = useSuppliers();
  const products = useMemo(() => {
    const raw = productsQuery.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Product[];
    if (typeof raw === 'object' && 'rows' in raw) return (raw as { rows: Product[] }).rows;
    if (typeof raw === 'object' && 'data' in raw) return (raw as { data: Product[] }).data;
    return [];
  }, [productsQuery.data]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // ---- mutations ----
  const createMut = useCreatePurchaseOrder();
  const confirmMut = useConfirmPurchaseOrder();
  const cancelMut = useCancelPurchaseOrder();

  // ---- form ----
  const form = useForm<POFormValues>({
    resolver: zodResolver(poFormSchema),
    defaultValues: {
      poDate: new Date().toISOString().slice(0, 10),
      supplier: '',
      remarks: '',
      items: [{ productId: '', currentStock: 0, minStock: 0, suggestedQty: 0, orderQty: 0, rate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = form.watch('items');

  const totalValue = useMemo(
    () => watchedItems.reduce((acc, it) => acc + (Number(it.orderQty) || 0) * (Number(it.rate) || 0), 0),
    [watchedItems],
  );

  const openCreate = useCallback(() => {
    setEditingPO(null);
    form.reset({
      poDate: new Date().toISOString().slice(0, 10),
      supplier: '',
      remarks: '',
      items: [{ productId: '', currentStock: 0, minStock: 0, suggestedQty: 0, orderQty: 0, rate: 0 }],
    });
    setSheetOpen(true);
    setSourceType('DIRECT');
    setSourceRfqId('');
    setSourceContractId('');
  }, [form]);

  const openEdit = useCallback(
    (po: PurchaseOrder) => {
      setEditingPO(po);
      form.reset({
        poDate: po.poDate.slice(0, 10),
        supplier: po.supplier,
        remarks: po.remarks ?? '',
        items: po.items.map((it) => ({
          productId: it.productId,
          currentStock: it.currentStock,
          minStock: it.minStock,
          suggestedQty: it.suggestedQty,
          orderQty: it.orderQty,
          rate: it.rate,
        })),
      });
      setSheetOpen(true);
    },
    [form],
  );

  // Auto-fill product fields when product selection changes
  function handleProductChange(idx: number, productId: string) {
    const p = productMap.get(productId);
    if (!p) return;
    const currentStock = p.currentStock ?? p.openingStock ?? 0;
    const minStock = p.minStockLevel ?? 0;
    const suggestedQty = Math.max(0, minStock - currentStock);

    form.setValue(`items.${idx}.currentStock`, currentStock);
    form.setValue(`items.${idx}.minStock`, minStock);
    form.setValue(`items.${idx}.suggestedQty`, suggestedQty);
    form.setValue(`items.${idx}.orderQty`, suggestedQty || 1);
    form.setValue(`items.${idx}.rate`, p.purchasePrice ?? 0);
  }

  async function handleSubmit(values: POFormValues) {
    try {
      if (!shopId) {
        toast.error('Select a plant/shop first');
        return;
      }
      const payload = {
        shopId,
        poDate: values.poDate,
        supplier: values.supplier,
        contractId: sourceType === 'CONTRACT' ? sourceContractId : undefined,
        remarks: values.remarks ?? '',
        items: values.items.map((it) => ({
          productId: it.productId,
          currentStock: it.currentStock,
          minStock: it.minStock,
          suggestedQty: it.suggestedQty,
          orderQty: it.orderQty,
          rate: it.rate,
        })),
      };

      const result = await createMut.mutateAsync(payload);
      toast.success(`Purchase order ${result.poNumber} saved as draft`);
      setSheetOpen(false);
      form.reset();
      setDetailId(result.id);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message;
      toast.error(msg ?? 'Failed to create purchase order');
    }
  }

  async function handleConfirm(id: string) {
    try {
      await confirmMut.mutateAsync(id);
      toast.success('Purchase order confirmed');
    } catch {
      toast.error('Failed to confirm purchase order');
    }
    setConfirmState(null);
  }

  async function handleCancel(id: string) {
    try {
      await cancelMut.mutateAsync(id);
      toast.success('Purchase order cancelled');
    } catch {
      toast.error('Failed to cancel purchase order');
    }
    setConfirmState(null);
  }

  function handleConvertToGR(poId: string) {
    navigate(`/goods-receipts/new?fromPo=${poId}`);
  }

  // ---- product search in form ----
  const [productSearch, setProductSearch] = useState('');

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const s = productSearch.toLowerCase();
    return products.filter(
      (p) => p.description.toLowerCase().includes(s) || p.productCode.toLowerCase().includes(s),
    );
  }, [products, productSearch]);

  function formatCurrency(val: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
  }

  return (
    <AppLayout>
      <PageHeader
        title="Purchase Orders"
        description="Manage purchase order documents"
        action={
          <Button onClick={openCreate} disabled={!shopId} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Create PO
          </Button>
        }
      />

      {/* Toolbar */}
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search PO number or supplier..."
            className="w-full sm:w-64"
          />

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'ALL' ? '' as typeof statusFilter : v as typeof statusFilter); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {!user?.shopId && (
            <Select value={selectedShopId} onValueChange={setSelectedShopId}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Select Plant" />
              </SelectTrigger>
              <SelectContent>
                {shops.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.shopName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {poQuery.isLoading ? (
          <LoadingSkeleton rows={6} columns={7} />
        ) : poQuery.isError ? (
          <div className="p-8 text-center text-sm text-destructive">
            Failed to load purchase orders. Please try again.
          </div>
        ) : poList.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-12 w-12" />}
            title="No purchase orders found"
            description="Create your first purchase order to get started."
            action={
              <Button variant="outline" onClick={openCreate} disabled={!shopId}>
                <Plus className="h-4 w-4" /> New Order
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poList.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>{new Date(po.poDate).toLocaleDateString()}</TableCell>
                    <TableCell>{po.supplier}</TableCell>
                    <TableCell className="text-center">{po.items?.length ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {po.totalValue != null ? formatCurrency(po.totalValue) : '—'}
                    </TableCell>
                    <TableCell><StatusBadge status={po.status} /></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailId(po.id)}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>

                          {po.status === 'DRAFT' && (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(po)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setConfirmState({ type: 'confirm', id: po.id, poNumber: po.poNumber })}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setConfirmState({ type: 'cancel', id: po.id, poNumber: po.poNumber })}
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Cancel
                              </DropdownMenuItem>
                            </>
                          )}

                          {po.status === 'CONFIRMED' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleConvertToGR(po.id)}>
                                <ArrowRightFromLine className="mr-2 h-4 w-4" /> Convert to GR
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator />
            <DataTablePagination page={page} pageSize={PAGE_SIZE} total={poTotal ?? poList.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* ---- CREATE / EDIT SHEET ---- */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{editingPO ? 'Edit Purchase Order' : 'New Purchase Order'}</SheetTitle>
            <SheetDescription>
              {editingPO ? `Editing ${editingPO.poNumber}` : 'Create a new purchase order'}
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="mt-6 space-y-6"
          >
            {!editingPO && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>PO Type</Label>
                  <Select value={sourceType} onValueChange={(v: 'DIRECT' | 'RFQ' | 'CONTRACT') => setSourceType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DIRECT">Direct PO</SelectItem>
                      <SelectItem value="RFQ">From RFQ</SelectItem>
                      <SelectItem value="CONTRACT">From Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {sourceType === 'RFQ' && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>RFQ</Label>
                    <Select
                      value={sourceRfqId}
                      onValueChange={(id) => {
                        setSourceRfqId(id);
                        const rfq = rfqs.find((r) => r.id === id);
                        if (!rfq) return;
                        form.setValue('supplier', rfq.suppliers?.[0]?.supplier?.supplierName ?? '');
                        form.setValue(
                          'items',
                          (rfq.items ?? []).map((it) => ({
                            productId: it.productId ?? '',
                            currentStock: 0,
                            minStock: 0,
                            suggestedQty: Number(it.quantity ?? 0),
                            orderQty: Number(it.quantity ?? 0),
                            rate: 0,
                          })),
                        );
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select RFQ" /></SelectTrigger>
                      <SelectContent>
                        {rfqs.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.rfqNumber} - {r.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {sourceType === 'CONTRACT' && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Contract</Label>
                    <Select
                      value={sourceContractId}
                      onValueChange={(id) => {
                        setSourceContractId(id);
                        const contract = contracts.find((c) => c.id === id);
                        if (!contract) return;
                        form.setValue('supplier', contract.supplier?.supplierName ?? '');
                        form.setValue(
                          'items',
                          ((contract as { items?: Array<{ productId?: string; quantity?: number; unitPrice?: number }> }).items ?? []).map(
                            (it) => ({
                              productId: it.productId ?? '',
                              currentStock: 0,
                              minStock: 0,
                              suggestedQty: Number(it.quantity ?? 0),
                              orderQty: Number(it.quantity ?? 0),
                              rate: Number(it.unitPrice ?? 0),
                            }),
                          ),
                        );
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Contract" /></SelectTrigger>
                      <SelectContent>
                        {contracts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.contractNumber} - {c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Header fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poDate">Order Date</Label>
                <Input id="poDate" type="date" {...form.register('poDate')} />
                {form.formState.errors.poDate && (
                  <p className="text-xs text-destructive">{form.formState.errors.poDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Controller
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.supplierName}>{s.supplierName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.supplier && (
                  <p className="text-xs text-destructive">{form.formState.errors.supplier.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea id="remarks" rows={2} placeholder="Optional notes..." {...form.register('remarks')} />
            </div>

            <Separator />

            {/* Items */}
            <div>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Label className="text-base">Line Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ productId: '', currentStock: 0, minStock: 0, suggestedQty: 0, orderQty: 0, rate: 0 })}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-3 w-3" /> Add Row
                </Button>
              </div>

              {form.formState.errors.items?.root && (
                <p className="mb-2 text-xs text-destructive">{form.formState.errors.items.root.message}</p>
              )}

              {/* Items table */}
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Product</TableHead>
                      <TableHead className="w-[90px] text-right">Stock</TableHead>
                      <TableHead className="w-[90px] text-right">Min</TableHead>
                      <TableHead className="w-[90px] text-right">Suggested</TableHead>
                      <TableHead className="w-[100px] text-right">Order Qty</TableHead>
                      <TableHead className="w-[100px] text-right">Rate</TableHead>
                      <TableHead className="w-[110px] text-right">Line Value</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, idx) => {
                      const orderQty = Number(watchedItems[idx]?.orderQty) || 0;
                      const rate = Number(watchedItems[idx]?.rate) || 0;
                      const lineValue = orderQty * rate;

                      return (
                        <TableRow key={field.id}>
                          {/* Product select */}
                          <TableCell>
                            <Controller
                              control={form.control}
                              name={`items.${idx}.productId`}
                              render={({ field: f }) => (
                                <Select
                                  value={f.value}
                                  onValueChange={(v) => {
                                    f.onChange(v);
                                    handleProductChange(idx, v);
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select product..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <div className="p-2">
                                      <Input
                                        placeholder="Search products..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        className="mb-2"
                                      />
                                    </div>
                                    {filteredProducts.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        <span className="font-medium">{p.productCode}</span>
                                        <span className="ml-1 text-muted-foreground">- {p.description}</span>
                                      </SelectItem>
                                    ))}
                                    {filteredProducts.length === 0 && (
                                      <p className="px-2 py-4 text-center text-sm text-muted-foreground">No products found</p>
                                    )}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {form.formState.errors.items?.[idx]?.productId && (
                              <p className="mt-0.5 text-[10px] text-destructive">
                                {form.formState.errors.items[idx]?.productId?.message}
                              </p>
                            )}
                          </TableCell>

                          {/* Current Stock (read-only) */}
                          <TableCell className="text-right">
                            <Input
                              readOnly
                              className="h-8 bg-muted text-right text-xs"
                              {...form.register(`items.${idx}.currentStock`, { valueAsNumber: true })}
                            />
                          </TableCell>

                          {/* Min Stock (read-only) */}
                          <TableCell className="text-right">
                            <Input
                              readOnly
                              className="h-8 bg-muted text-right text-xs"
                              {...form.register(`items.${idx}.minStock`, { valueAsNumber: true })}
                            />
                          </TableCell>

                          {/* Suggested Qty (read-only) */}
                          <TableCell className="text-right">
                            <Input
                              readOnly
                              className="h-8 bg-muted text-right text-xs"
                              {...form.register(`items.${idx}.suggestedQty`, { valueAsNumber: true })}
                            />
                          </TableCell>

                          {/* Order Qty (editable) */}
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              className="h-8 text-right text-xs"
                              {...form.register(`items.${idx}.orderQty`, { valueAsNumber: true })}
                            />
                            {form.formState.errors.items?.[idx]?.orderQty && (
                              <p className="mt-0.5 text-[10px] text-destructive">
                                {form.formState.errors.items[idx]?.orderQty?.message}
                              </p>
                            )}
                          </TableCell>

                          {/* Rate (editable) */}
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="h-8 text-right text-xs"
                              {...form.register(`items.${idx}.rate`, { valueAsNumber: true })}
                            />
                          </TableCell>

                          {/* Line Value (computed) */}
                          <TableCell className="text-right font-medium text-sm">
                            {formatCurrency(lineValue)}
                          </TableCell>

                          {/* Remove */}
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => fields.length > 1 && remove(idx)}
                              disabled={fields.length <= 1}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={6} className="text-right font-semibold">
                        Total
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totalValue)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                <ShoppingCart className="h-4 w-4" />
                {createMut.isPending ? 'Saving...' : 'Save as Draft'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ---- DETAIL DIALOG ---- */}
      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5" />
              {detailPO?.poNumber ?? 'Purchase Order'}
            </DialogTitle>
            <DialogDescription>Purchase order details and line items</DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <LoadingSkeleton rows={4} columns={4} />
          ) : detailPO ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date(detailPO.poDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Supplier</p>
                  <p className="font-medium">{detailPO.supplier}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={detailPO.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="font-bold">{formatCurrency(detailPO.totalValue)}</p>
                </div>
              </div>

              {detailPO.remarks && (
                <div>
                  <p className="text-xs text-muted-foreground">Remarks</p>
                  <p className="text-sm">{detailPO.remarks}</p>
                </div>
              )}

              <Separator />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">Order Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Line Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailPO.items.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <span className="font-medium">{item.product?.productCode}</span>
                        <span className="ml-2 text-sm text-muted-foreground">{item.product?.description}</span>
                      </TableCell>
                      <TableCell className="text-right">{item.currentStock}</TableCell>
                      <TableCell className="text-right">{item.minStock}</TableCell>
                      <TableCell className="text-right font-medium">{item.orderQty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.lineValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={6} className="text-right font-semibold">Total</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(detailPO.totalValue)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>

              {detailPO.status === 'CONFIRMED' && (
                <>
                  <Separator />
                  <div className="flex justify-end">
                    <Button onClick={() => { setDetailId(null); handleConvertToGR(detailPO.id); }}>
                      <ArrowRightFromLine className="h-4 w-4" />
                      Convert to Goods Receipt
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ---- CONFIRM DIALOGS ---- */}
      <ConfirmDialog
        open={confirmState?.type === 'confirm'}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title="Confirm Purchase Order"
        description={`Are you sure you want to confirm ${confirmState?.poNumber ?? 'this order'}? This will move it to confirmed status.`}
        confirmLabel="Confirm Order"
        onConfirm={() => confirmState && handleConfirm(confirmState.id)}
        loading={confirmMut.isPending}
      />

      <ConfirmDialog
        open={confirmState?.type === 'cancel'}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title="Cancel Purchase Order"
        description={`Are you sure you want to cancel ${confirmState?.poNumber ?? 'this order'}? This action cannot be undone.`}
        confirmLabel="Cancel Order"
        variant="destructive"
        onConfirm={() => confirmState && handleCancel(confirmState.id)}
        loading={cancelMut.isPending}
      />
    </AppLayout>
  );
}
