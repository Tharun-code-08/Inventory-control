import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { PageHeader, SearchInput, ConfirmDialog, DataTablePagination, LoadingSkeleton, EmptyState, P2PFlowTimeline, type P2PStep } from '@/components/shared';

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
import { useStorageLocations } from '@/hooks/use-storage-locations';
import { mapPoFormToCreatePayload } from '@/lib/payload-mappers';
import { hasPermission } from '@/lib/permissions';

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
  priority: z.string().optional(),
  paymentTerms: z.string().optional(),
  supplier: z.string().min(1, 'Supplier is required'),
  deliveryPlantId: z.string().optional(),
  storageLocationId: z.string().optional(),
  deliveryAddress: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(poItemSchema).min(1, 'Add at least one item'),
});

type POFormValues = z.infer<typeof poFormSchema>;

const PAGE_SIZE = 10;

function tomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Multi-plant: a Product can be assigned to several plants. The PO form is
 * scoped to a single delivery plant, so stock thresholds (`minStockLevel`)
 * come from the plant-specific assignment, not the product master.
 */
function getProductPlant(product: Product, shopId: string) {
  return product.plants.find((p) => p.shopId === shopId);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PurchaseOrdersPage({ createOnly = false }: { createOnly?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const canMutatePo = hasPermission(user, 'purchase_order:create');
  const [selectedShopId, setSelectedShopId] = useState('');
  const { data: shops = [] } = useShops();
  const shopId = user?.shopId ?? selectedShopId;
  const [sourceType, setSourceType] = useState<'DIRECT' | 'RFQ' | 'CONTRACT'>('DIRECT');
  const [sourceRfqId, setSourceRfqId] = useState('');
  const [sourceContractId, setSourceContractId] = useState('');

  // ---- list filters ----
  const [search, setSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | PurchaseOrderStatus>('');
  const [lifecycleFilter, setLifecycleFilter] = useState<
    'ALL' | 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED'
  >('ALL');
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

  const poData = poQuery.data?.data ?? [];
  const poMeta = poQuery.data?.meta;

  const poList = useMemo(() => poData, [poData]);

  const poTotal = useMemo(() => {
    if (poMeta?.total !== undefined) return poMeta.total;
    return undefined;
  }, [poMeta]);

  const filteredPoList = useMemo(() => {
    const supplierTerm = supplierSearch.trim().toLowerCase();
    return poList.filter((po) => {
      const lifecycle = (po.lifecycleStatus ?? po.status) as
        | 'DRAFT'
        | 'CONFIRMED'
        | 'PARTIALLY_RECEIVED'
        | 'FULLY_RECEIVED'
        | 'CANCELLED';

      if (lifecycleFilter !== 'ALL' && lifecycle !== lifecycleFilter) {
        return false;
      }
      if (supplierTerm && !po.supplier.toLowerCase().includes(supplierTerm)) {
        return false;
      }
      return true;
    });
  }, [lifecycleFilter, poList, supplierSearch]);

  const lifecycleCounts = useMemo(() => {
    const counts = {
      ALL: poList.length,
      DRAFT: 0,
      CONFIRMED: 0,
      PARTIALLY_RECEIVED: 0,
      FULLY_RECEIVED: 0,
      CANCELLED: 0,
    };
    for (const po of poList) {
      const lifecycle = (po.lifecycleStatus ?? po.status) as keyof typeof counts;
      if (lifecycle in counts) {
        counts[lifecycle] += 1;
      }
    }
    return counts;
  }, [poList]);

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

  // ---- mutations ----
  const createMut = useCreatePurchaseOrder();
  const confirmMut = useConfirmPurchaseOrder();
  const cancelMut = useCancelPurchaseOrder();

  // ---- form ----
  const form = useForm<POFormValues>({
    resolver: zodResolver(poFormSchema),
    defaultValues: {
      poDate: tomorrowDateString(),
      priority: 'Medium',
      paymentTerms: 'Net 30',
      supplier: '',
      deliveryPlantId: shopId ?? '',
      storageLocationId: '',
      deliveryAddress: '',
      remarks: '',
      items: [{ productId: '', currentStock: 0, minStock: 0, suggestedQty: 0, orderQty: 0, rate: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = form.watch('items');
  const selectedDeliveryPlantId = form.watch('deliveryPlantId');
  const { data: storageLocations = [] } = useStorageLocations(selectedDeliveryPlantId || undefined);
  const targetProductShopId = selectedDeliveryPlantId || shopId || '';
  // Multi-plant: a product is "selectable for this PO" if it's assigned to
  // the delivery plant. We still fall back to all products when no plant is
  // chosen (so the dropdown isn't empty before the user picks one).
  const selectableProducts = useMemo(
    () =>
      targetProductShopId
        ? products.filter((p) => p.plants.some((plant) => plant.shopId === targetProductShopId))
        : products,
    [products, targetProductShopId],
  );
  const productMap = useMemo(() => new Map(selectableProducts.map((p) => [p.id, p])), [selectableProducts]);

  const totalValue = fields.reduce(
    (acc, _field, idx) =>
      acc + (Number(watchedItems?.[idx]?.orderQty) || 0) * (Number(watchedItems?.[idx]?.rate) || 0),
    0,
  );

  const openCreate = useCallback(() => {
    setEditingPO(null);
    form.reset({
      poDate: tomorrowDateString(),
        priority: 'Medium',
        paymentTerms: 'Net 30',
      supplier: '',
        deliveryPlantId: shopId ?? '',
        storageLocationId: '',
        deliveryAddress: '',
      remarks: '',
      items: [{ productId: '', currentStock: 0, minStock: 0, suggestedQty: 0, orderQty: 0, rate: 0 }],
    });
    setSheetOpen(true);
    setSourceType('DIRECT');
    setSourceRfqId('');
    setSourceContractId('');
  }, [form, shopId]);

  type PoPrefillState = {
    poPrefill?: {
      productId: string;
      shopId: string;
      supplier: string | null;
      orderQty: number;
      rate: number;
      currentStock: number;
      minStockLevel: number;
      suggestedQty: number;
      hasPriorOrder: boolean;
      lastPoNumber: string | null;
    };
  };

  const prefillAppliedRef = useRef(false);

  useEffect(() => {
    if (location.pathname !== '/purchase-orders/new') {
      prefillAppliedRef.current = false;
      return;
    }
    const prefill = (location.state as PoPrefillState | null)?.poPrefill;
    if (!prefill) {
      openCreate();
      return;
    }
    if (prefillAppliedRef.current) return;
    if (!productMap.has(prefill.productId)) return;

    prefillAppliedRef.current = true;
    if (!user?.shopId) setSelectedShopId(prefill.shopId);
    form.reset({
      poDate: tomorrowDateString(),
      priority: 'Medium',
      paymentTerms: 'Net 30',
      supplier: prefill.supplier ?? '',
      deliveryPlantId: prefill.shopId,
      storageLocationId: '',
      deliveryAddress: '',
      remarks:
        prefill.hasPriorOrder && prefill.lastPoNumber
          ? `Reorder (low stock) — last PO ${prefill.lastPoNumber}`
          : 'Reorder (low stock)',
      items: [
        {
          productId: prefill.productId,
          currentStock: prefill.currentStock,
          minStock: prefill.minStockLevel,
          suggestedQty: prefill.suggestedQty,
          orderQty: prefill.orderQty,
          rate: prefill.rate,
        },
      ],
    });
    setSheetOpen(true);
    setSourceType('DIRECT');
    setSourceRfqId('');
    setSourceContractId('');
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, openCreate, productMap, form, navigate, user?.shopId]);

  const openEdit = useCallback(
    (po: PurchaseOrder) => {
      setEditingPO(po);
      form.reset({
        poDate: po.poDate.slice(0, 10),
        priority: 'Medium',
        paymentTerms: 'Net 30',
        supplier: po.supplier,
        deliveryPlantId: po.shopId,
        storageLocationId: '',
        deliveryAddress: '',
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
    const plantStock = shopId ? p.stockByShop?.[shopId] : undefined;
    const currentStock = plantStock ?? p.currentStock ?? 0;
    const plantAssignment = shopId ? getProductPlant(p, shopId) : undefined;
    const minStock = plantAssignment?.minStockLevel ?? 0;
    const suggestedQty = Math.max(0, minStock - currentStock);

    form.setValue(`items.${idx}.currentStock`, currentStock);
    form.setValue(`items.${idx}.minStock`, minStock);
    form.setValue(`items.${idx}.suggestedQty`, suggestedQty);
    form.setValue(`items.${idx}.orderQty`, 0);
    form.setValue(`items.${idx}.rate`, p.purchasePrice ?? 0);
  }

  async function handleSubmit(values: POFormValues) {
    try {
      const resolvedShopId = values.deliveryPlantId || shopId;
      if (!resolvedShopId) {
        toast.error('Select a delivery plant');
        return;
      }
      const payload = mapPoFormToCreatePayload({
        values,
        resolvedShopId,
        sourceType,
        sourceContractId,
      });

      const result = await createMut.mutateAsync({
        ...payload,
        idempotencyKey:
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `po-${Date.now()}`,
      });
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
    if (!productSearch.trim()) return selectableProducts;
    const s = productSearch.toLowerCase();
    return selectableProducts.filter(
      (p) => p.description.toLowerCase().includes(s) || p.productCode.toLowerCase().includes(s),
    );
  }, [selectableProducts, productSearch]);

  useEffect(() => {
    if (!targetProductShopId) return;
    const items = form.getValues('items');
    items.forEach((item, idx) => {
      if (item.productId && !productMap.has(item.productId)) {
        form.setValue(`items.${idx}.productId`, '');
        form.setValue(`items.${idx}.currentStock`, 0);
        form.setValue(`items.${idx}.minStock`, 0);
        form.setValue(`items.${idx}.suggestedQty`, 0);
        form.setValue(`items.${idx}.orderQty`, 0);
        form.setValue(`items.${idx}.rate`, 0);
      }
    });
  }, [form, productMap, targetProductShopId]);

  function formatCurrency(val: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
  }

  function lifecycleSteps(po: PurchaseOrder): P2PStep[] {
    const status = po.lifecycleStatus ?? po.status;
    return [
      { key: 'po', label: 'PO confirmed', state: status === 'DRAFT' ? 'active' : 'done' },
      {
        key: 'partial',
        label: 'Partial GR',
        state: status === 'PARTIALLY_RECEIVED' ? 'active' : status === 'FULLY_RECEIVED' ? 'done' : 'todo',
      },
      { key: 'full', label: 'PO fully received', state: status === 'FULLY_RECEIVED' ? 'done' : 'todo' },
      { key: 'invoice', label: 'Invoice & payable', state: 'todo' },
      { key: 'payment', label: 'Payment tracking', state: 'todo' },
    ];
  }

  function lifecycleLabel(po: PurchaseOrder) {
    return po.lifecycleStatus && po.lifecycleStatus !== po.status ? po.lifecycleStatus.replaceAll('_', ' ') : po.status;
  }

  return (
    <AppLayout>
      <div className={createOnly ? 'create-page-shell p-4 sm:p-6' : ''}>
        <PageHeader
          title={createOnly ? 'Create Purchase Order' : 'Purchase Orders'}
          description={createOnly ? 'Fill in details to create a new purchase order' : 'Manage purchase order documents'}
        >
          {createOnly ? (
            <Button variant="outline" onClick={() => navigate('/purchase-orders')} className="w-full sm:w-auto">
              Back
            </Button>
          ) : (
            <Button onClick={() => navigate('/purchase-orders/new')} className="premium-button w-full border-0 text-white sm:w-auto" disabled={!canMutatePo}>
              <Plus className="h-4 w-4" />
              Create PO
            </Button>
          )}
        </PageHeader>

      {!createOnly && (
        <>
          {/* Toolbar */}
          <Card className="surface-1 mb-4 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {([
            ['ALL', 'All'],
            ['DRAFT', 'Draft'],
            ['CONFIRMED', 'Confirmed'],
            ['PARTIALLY_RECEIVED', 'Partially Received'],
            ['FULLY_RECEIVED', 'Completed'],
            ['CANCELLED', 'Cancelled'],
          ] as const).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={lifecycleFilter === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setLifecycleFilter(value);
                setPage(1);
              }}
              className="h-8"
            >
              {label} ({lifecycleCounts[value]})
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search PO number..."
            className="w-full sm:w-64"
          />
          <Input
            value={supplierSearch}
            onChange={(e) => {
              setSupplierSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by supplier..."
            className="w-full sm:w-56"
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
          <Card className="surface-1">
        {poQuery.isLoading ? (
          <LoadingSkeleton rows={6} columns={7} />
        ) : poQuery.isError ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-destructive">Failed to load purchase orders. Please try again.</p>
            <Button variant="outline" size="sm" onClick={() => poQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredPoList.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No purchase orders found"
            description="Create your first purchase order to get started."
            action={
              <Button variant="outline" onClick={() => navigate('/purchase-orders/new')} disabled={!canMutatePo}>
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
                {filteredPoList.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>{new Date(po.poDate).toLocaleDateString()}</TableCell>
                    <TableCell>{po.supplier}</TableCell>
                    <TableCell className="text-center">{po.items?.length ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {po.totalValue != null ? formatCurrency(po.totalValue) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={po.status} />
                        <span className="text-[11px] text-muted-foreground">{lifecycleLabel(po)}</span>
                      </div>
                    </TableCell>
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
                              <DropdownMenuItem onClick={() => openEdit(po)} disabled={!canMutatePo}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setConfirmState({ type: 'confirm', id: po.id, poNumber: po.poNumber })} disabled={!canMutatePo}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={!canMutatePo}
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
            <DataTablePagination page={page} pageSize={PAGE_SIZE} total={poTotal ?? filteredPoList.length} onPageChange={setPage} />
          </>
        )}
          </Card>
        </>
      )}

      {/* ---- CREATE / EDIT SHEET ---- */}
      <Sheet
        open={createOnly ? true : sheetOpen}
        onOpenChange={(open) => {
          if (!createOnly) {
            setSheetOpen(open);
          }
          if (!open) {
            navigate('/purchase-orders');
          }
        }}
      >
        <SheetContent side="right" className={cn("w-full overflow-y-auto", createOnly ? "border-l-0 sm:w-full sm:max-w-none" : "border-l sm:max-w-3xl")}>
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

            {/* Order details */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Order Details</Label>
              <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier *</Label>
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
              <div className="space-y-2">
                <Label>Priority</Label>
                <Controller
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poDate">Delivery Date</Label>
                <Input id="poDate" type="date" min={tomorrowDateString()} {...form.register('poDate')} />
                {form.formState.errors.poDate && (
                  <p className="text-xs text-destructive">{form.formState.errors.poDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Controller
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select payment terms" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Net 15">Net 15</SelectItem>
                        <SelectItem value="Net 30">Net 30</SelectItem>
                        <SelectItem value="Net 45">Net 45</SelectItem>
                        <SelectItem value="Net 60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            </div>

            {/* Delivery location */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Delivery Location</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Delivery Plant</Label>
                  <Controller
                    control={form.control}
                    name="deliveryPlantId"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          const selected = shops.find((s) => s.id === value);
                          form.setValue('deliveryAddress', selected?.address ?? '');
                          form.setValue('storageLocationId', '');
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Delivery Plant" /></SelectTrigger>
                        <SelectContent>
                          {shops.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.shopName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Storage Location</Label>
                  <Controller
                    control={form.control}
                    name="storageLocationId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Storage Location" /></SelectTrigger>
                        <SelectContent>
                          {storageLocations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Delivery Address</Label>
                <Input placeholder="Delivery address" {...form.register('deliveryAddress')} />
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
                  disabled={!selectedDeliveryPlantId || !form.watch('storageLocationId')}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-3 w-3" /> Add Item
                </Button>
              </div>
              {(!selectedDeliveryPlantId || !form.watch('storageLocationId')) && (
                <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Select a delivery plant and storage location first to add line items.
                </div>
              )}

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
                      <TableCell colSpan={4} className="text-right font-semibold">
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSheetOpen(false);
                  if (location.pathname === '/purchase-orders/new') {
                    navigate('/purchase-orders');
                  }
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending || !canMutatePo}>
                <ShoppingCart className="h-4 w-4" />
                {createMut.isPending ? 'Saving...' : 'Save as Draft'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
      </div>

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
              <P2PFlowTimeline title="P2P progress" steps={lifecycleSteps(detailPO as PurchaseOrder)} />
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
                      <TableCell className="text-right font-medium">{item.orderQty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.lineValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-semibold">Total</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(detailPO.totalValue)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>

              {Array.isArray((detailPO as PurchaseOrder).receiptProgress) &&
                (detailPO as PurchaseOrder).receiptProgress!.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-sm font-semibold">Receipt progress</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Ordered</TableHead>
                            <TableHead className="text-right">Received</TableHead>
                            <TableHead className="text-right">Remaining</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailPO as PurchaseOrder).receiptProgress!.map((row) => (
                            <TableRow key={row.productId}>
                              <TableCell className="font-mono text-xs">{row.productId}</TableCell>
                              <TableCell className="text-right">{Number(row.orderedQty)}</TableCell>
                              <TableCell className="text-right">{Number(row.receivedQty)}</TableCell>
                              <TableCell className="text-right font-medium">{Number(row.remainingQty)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

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
