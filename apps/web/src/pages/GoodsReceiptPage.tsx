import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Send,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
  X,
  Loader2,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';
import {
  useGoodsReceipts,
  useCreateGoodsReceipt,
  useUpdateGoodsReceipt,
  usePostGoodsReceipt,
  useDeleteGoodsReceipt,
  type GoodsReceipt,
  type GoodsReceiptFilters,
  type GoodsReceiptStatus,
} from '@/hooks/use-goods-receipts';
import { useProducts, type Product } from '@/hooks/use-products';
import { StatusBadge } from '@/components/shared/status-badge';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { AppLayout } from '@/components/AppLayout';
import { usePurchaseOrder, usePurchaseOrders, type PurchaseOrder } from '@/hooks/use-purchase-orders';
import { P2PFlowTimeline, type P2PStep } from '@/components/shared';

const PAGE_SIZE = 10;

const grItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.coerce.number().min(1, 'Received quantity must be at least 1'),
  uom: z.string().min(1, 'UOM is required'),
  purchaseRate: z.coerce.number().min(0, 'Rate must be 0 or more'),
  batchNumber: z.string().optional(),
  serialNumber: z.string().optional(),
});

const grFormSchema = z.object({
  supplierName: z.string().min(1, 'Supplier name is required'),
  grDate: z.string().min(1, 'Date is required'),
  purchaseOrderId: z.string().optional(),
  supplierRef: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(grItemSchema).min(1, 'At least one item is required'),
});

type GRFormValues = z.infer<typeof grFormSchema>;

const emptyItem = { productId: '', quantity: 1, uom: '', purchaseRate: 0, batchNumber: '', serialNumber: '' };

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return '-';
  const datePart = String(value).split('T')[0];
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return '-';
  return `${d}/${m}/${y}`;
}

function resolveGrLineProduct(
  item: { productId: string; product?: { description?: string; productCode?: string } | null },
  productMap: Map<string, Product>,
) {
  const fromLine = item.product;
  const fromCatalog = productMap.get(item.productId);
  return {
    description:
      fromLine?.description?.trim() ||
      fromCatalog?.description ||
      'Unknown product',
    productCode:
      fromLine?.productCode?.trim() ||
      fromCatalog?.productCode ||
      item.productId,
  };
}

function poSuggestedItems(po: PurchaseOrder) {
  if (po.receiptProgress?.length) {
    return po.receiptProgress
      .filter((line) => Number(line.remainingQty) > 0)
      .map((line) => ({
        productId: line.productId,
        quantity: Number(line.remainingQty),
        uom: '',
        purchaseRate: 0,
        batchNumber: '',
        serialNumber: '',
      }));
  }

  return (po.items ?? []).map((line) => ({
    productId: line.productId,
    quantity: Number(line.orderQty) || 1,
    uom: '',
    purchaseRate: Number(line.rate) || 0,
    batchNumber: '',
    serialNumber: '',
  }));
}

export function GoodsReceiptPage({ createOnly = false }: { createOnly?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const shopId = user?.shopId ?? '';
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fromPoId = searchParams.get('fromPo') ?? '';
  const poQuery = usePurchaseOrder(fromPoId);
  const poListQuery = usePurchaseOrders({
    shopId: shopId || undefined,
    take: 200,
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingGR, setEditingGR] = useState<GoodsReceipt | null>(null);
  const [viewingGR, setViewingGR] = useState<GoodsReceipt | null>(null);
  const [postTarget, setPostTarget] = useState<GoodsReceipt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GoodsReceipt | null>(null);

  const filters: GoodsReceiptFilters = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? (statusFilter as GoodsReceiptStatus) : undefined,
    shopId: shopId || undefined,
  };

  const { data, isLoading, isError } = useGoodsReceipts(filters);
  const createGR = useCreateGoodsReceipt();
  const updateGR = useUpdateGoodsReceipt();
  const postGR = usePostGoodsReceipt();
  const deleteGR = useDeleteGoodsReceipt();

  const { data: productsData } = useProducts({
    shopId: shopId || undefined,
    isActive: true,
    limit: 100,
    page: 1,
  });

  const productList: Product[] = productsData?.items ?? [];
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of productList) map.set(p.id, p);
    return map;
  }, [productList]);

  const items: GoodsReceipt[] = data?.items ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };

  const debounceTimer = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceTimer[0]) clearTimeout(debounceTimer[0]);
      debounceTimer[0] = setTimeout(() => {
        setDebouncedSearch(value);
        setPage(1);
      }, 400);
    },
    [debounceTimer],
  );

  const form = useForm<GRFormValues>({
    resolver: zodResolver(grFormSchema),
    defaultValues: {
      supplierName: '',
      grDate: todayISO(),
      purchaseOrderId: '',
      supplierRef: '',
      remarks: '',
      items: [{ ...emptyItem }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const availablePoList = useMemo(() => {
    const raw = poListQuery.data;
    if (!raw) return [] as PurchaseOrder[];
    if (Array.isArray(raw)) return raw as PurchaseOrder[];
    if (typeof raw === 'object' && 'rows' in raw) return (raw as { rows: PurchaseOrder[] }).rows;
    if (typeof raw === 'object' && 'data' in raw) return (raw as { data: PurchaseOrder[] }).data;
    return [] as PurchaseOrder[];
  }, [poListQuery.data]);

  const eligiblePoList = useMemo(
    () =>
      availablePoList.filter((po) => {
        const lifecycle = po.lifecycleStatus ?? po.status;
        return lifecycle === 'CONFIRMED' || lifecycle === 'PARTIALLY_RECEIVED';
      }),
    [availablePoList],
  );
  const watchedPurchaseOrderId = form.watch('purchaseOrderId');
  const selectedPo = useMemo(
    () => eligiblePoList.find((po) => po.id === (watchedPurchaseOrderId || '')),
    [eligiblePoList, watchedPurchaseOrderId],
  );

  const watchedItems = form.watch('items') ?? [];
  const lineValues = watchedItems.map((item) => (item?.quantity || 0) * (item?.purchaseRate || 0));
  const totalValue = lineValues.reduce((sum, v) => sum + v, 0);

  const openCreate = () => {
    setEditingGR(null);
    const po = poQuery.data;
    form.reset({
      supplierName: po?.supplier ?? '',
      grDate: todayISO(),
      supplierRef: '',
      remarks: po ? `Auto-created from PO ${po.poNumber}` : '',
      purchaseOrderId: po?.id,
      items:
        po?.receiptProgress?.length
          ? po.receiptProgress
              .filter((line) => Number(line.remainingQty) > 0)
              .map((line) => ({
                productId: line.productId,
                quantity: Number(line.remainingQty),
                uom: '',
                purchaseRate: 0,
                batchNumber: '',
                serialNumber: '',
              }))
          : [{ ...emptyItem }],
    });
    setSheetOpen(true);
  };

  useEffect(() => {
    if (editingGR) return;
    if (!watchedPurchaseOrderId) return;
    const selectedPo = eligiblePoList.find((po) => po.id === watchedPurchaseOrderId);
    if (!selectedPo) return;

    form.setValue('supplierName', selectedPo.supplier, { shouldDirty: true });
    const suggestedItems = poSuggestedItems(selectedPo);

    if (suggestedItems.length > 0) {
      form.setValue('items', suggestedItems, { shouldDirty: true });
    }
  }, [editingGR, eligiblePoList, form, watchedPurchaseOrderId]);

  useEffect(() => {
    const currentItems = form.getValues('items') ?? [];
    currentItems.forEach((item, index) => {
      if (!item.productId) return;
      const product = productMap.get(item.productId);
      if (!product) return;

      if (!item.uom) {
        form.setValue(`items.${index}.uom`, product.uom, { shouldDirty: true });
      }
      if (!item.purchaseRate || item.purchaseRate <= 0) {
        form.setValue(`items.${index}.purchaseRate`, product.purchasePrice, { shouldDirty: true });
      }
    });
  }, [fields.length, form, productMap, watchedPurchaseOrderId]);

  const poFlow: P2PStep[] | null = poQuery.data
    ? [
        { key: 'po', label: 'PO confirmed', state: 'done' },
        {
          key: 'partial',
          label: 'Partial GR',
          state: poQuery.data.lifecycleStatus === 'PARTIALLY_RECEIVED' ? 'active' : 'done',
        },
        {
          key: 'full',
          label: 'PO fully received',
          state: poQuery.data.lifecycleStatus === 'FULLY_RECEIVED' ? 'done' : 'todo',
        },
        { key: 'return', label: 'Goods return (if needed)', state: 'todo' },
        { key: 'payment', label: 'Payment tracking', state: 'todo' },
      ]
    : null;

  const openEdit = (gr: GoodsReceipt) => {
    setEditingGR(gr);
    const existingItems = (gr.items ?? []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      uom: item.uom,
      purchaseRate: item.purchaseRate,
      batchNumber: item.batchNumber ?? '',
      serialNumber: item.serialNumber ?? '',
    }));
    const linkedPo = availablePoList.find((po) => po.id === gr.purchaseOrderId);
    const fallbackItems = linkedPo ? poSuggestedItems(linkedPo) : [{ ...emptyItem }];
    form.reset({
      supplierName: gr.supplierName,
      grDate: gr.grDate.split('T')[0],
      purchaseOrderId: gr.purchaseOrderId ?? '',
      supplierRef: gr.supplierRef || '',
      remarks: gr.remarks || '',
      items: existingItems.length > 0 ? existingItems : fallbackItems,
    });
    setSheetOpen(true);
  };

  const onProductSelect = (index: number, productId: string) => {
    const product = productMap.get(productId);
    if (product) {
      form.setValue(`items.${index}.productId`, productId);
      form.setValue(`items.${index}.uom`, product.uom);
      form.setValue(`items.${index}.purchaseRate`, product.purchasePrice);
    }
  };

  const onSubmit = async (values: GRFormValues) => {
    try {
      const resolvedShopId = user?.shopId ?? selectedPo?.shopId ?? poQuery.data?.shopId ?? '';
      if (!resolvedShopId) {
        toast.error('Select a purchase order linked to a plant/shop');
        return;
      }

      if (editingGR) {
        const payloadItems = values.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          uom: item.uom,
          purchaseRate: item.purchaseRate,
          batchNumber: item.batchNumber?.trim() || undefined,
          serialNumber: item.serialNumber?.trim() || undefined,
        }));
        await updateGR.mutateAsync({
          id: editingGR.id,
          shopId: resolvedShopId,
          grDate: values.grDate,
          purchaseOrderId: values.purchaseOrderId || undefined,
          supplierName: values.supplierName,
          supplierRef: values.supplierRef,
          remarks: values.remarks,
          items: payloadItems,
        });
        toast.success('Goods receipt updated successfully');
      } else {
        const payloadItems = values.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          uom: item.uom,
          purchaseRate: item.purchaseRate,
          batchNumber: item.batchNumber?.trim() || undefined,
          serialNumber: item.serialNumber?.trim() || undefined,
        }));
        await createGR.mutateAsync({
          shopId: resolvedShopId,
          grDate: values.grDate,
          purchaseOrderId: values.purchaseOrderId || undefined,
          supplierName: values.supplierName,
          supplierRef: values.supplierRef,
          remarks: values.remarks,
          items: payloadItems,
        });
        toast.success('Goods receipt created successfully');
      }
      if (createOnly) {
        navigate('/goods-receipts');
      } else {
        setSheetOpen(false);
        setEditingGR(null);
      }
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: { message?: string }; message?: string }; statusText?: string };
        message?: string;
      };
      const msg =
        error.response?.data?.error?.message ??
        error.response?.data?.message ??
        error.response?.statusText ??
        error.message ??
        'Something went wrong';
      toast.error(msg);
    }
  };

  const handlePost = async () => {
    if (!postTarget) return;
    try {
      await postGR.mutateAsync(postTarget.id);
      toast.success(`${postTarget.grNumber} posted successfully`);
    } catch {
      toast.error('Failed to post goods receipt');
    }
    setPostTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGR.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.grNumber} deleted`);
    } catch {
      toast.error('Failed to delete goods receipt');
    }
    setDeleteTarget(null);
  };

  const isMutating = createGR.isPending || updateGR.isPending;

  return (
    <AppLayout active="Goods Receipts">
      <div className={cn('space-y-5', createOnly && 'create-page-shell p-4 sm:p-6')}>
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{createOnly ? 'Create Goods Receipt' : 'Goods Receipts'}</h1>
            <p className="text-sm text-slate-500">
              {createOnly ? 'Fill in details to create a new goods receipt' : 'Record incoming stock from suppliers'}
            </p>
          </div>
          {createOnly ? (
            <Button variant="outline" onClick={() => navigate('/goods-receipts')} className="w-full sm:w-auto">
              Back
            </Button>
          ) : (
            <Button onClick={() => navigate('/goods-receipts/new')} className="premium-button w-full border-0 text-white sm:w-auto">
              <Plus className="h-4 w-4" />
              New Receipt
            </Button>
          )}
        </div>

        {!createOnly && (
          <>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px] sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by GR number or supplier..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="POSTED">Posted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table Card */}
        <div className="surface-1 rounded-xl shadow-sm">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <p className="text-sm font-medium text-destructive">
                Failed to load goods receipts
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please try refreshing the page
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No goods receipts found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {debouncedSearch || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first receipt'}
              </p>
              {!debouncedSearch && statusFilter === 'all' && (
                <Button size="sm" className="premium-button mt-4 border-0 text-white" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  New Receipt
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table className="text-[13px]">
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-semibold">GR Number</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Supplier</TableHead>
                    <TableHead className="font-semibold text-center">Items</TableHead>
                    <TableHead className="font-semibold text-right">Total Value</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((gr) => (
                    <TableRow
                      key={gr.id}
                      className="cursor-pointer"
                      onClick={() => setViewingGR(gr)}
                    >
                      <TableCell className="font-mono text-xs font-medium">
                        {gr.grNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateOnly(gr.grDate)}
                      </TableCell>
                      <TableCell className="font-medium max-w-[180px] truncate">
                        {gr.supplierName}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{(gr.items ?? []).length}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {Number(gr.totalValue ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={gr.status} />
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center justify-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewingGR(gr)}
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {gr.status === 'DRAFT' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(gr)}
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => setPostTarget(gr)}
                                title="Post"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTarget(gr)}
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing{' '}
                  <span className="font-medium">
                    {(meta.page - 1) * meta.limit + 1}
                  </span>
                  –
                  <span className="font-medium">
                    {Math.min(meta.page * meta.limit, meta.total)}
                  </span>{' '}
                  of <span className="font-medium">{meta.total}</span> receipts
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {meta.page} of {meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
          </>
        )}
      </div>

      {/* GR Detail Dialog */}
      <Dialog
        open={!!viewingGR}
        onOpenChange={(open) => !open && setViewingGR(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {viewingGR?.grNumber}
              {viewingGR && <StatusBadge status={viewingGR.status} />}
            </DialogTitle>
            <DialogDescription>
              Goods receipt details and line items
            </DialogDescription>
          </DialogHeader>

          {viewingGR && (
      <div className="space-y-4">
        {poFlow ? <P2PFlowTimeline title={`PO-linked GR flow (${poQuery.data?.poNumber ?? ''})`} steps={poFlow} /> : null}
              <div className="surface-2 grid gap-4 rounded-lg border p-4 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Supplier</span>
                  <p className="font-medium">{viewingGR.supplierName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">
                    {formatDateOnly(viewingGR.grDate)}
                  </p>
                </div>
                {viewingGR.supplierRef && (
                  <div>
                    <span className="text-muted-foreground">Supplier Ref</span>
                    <p className="font-medium">{viewingGR.supplierRef}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Total Value</span>
                  <p className="font-medium tabular-nums">
                    {Number(viewingGR.totalValue ?? 0).toFixed(2)}
                  </p>
                </div>
                {viewingGR.remarks && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Remarks</span>
                    <p className="font-medium">{viewingGR.remarks}</p>
                  </div>
                )}
              </div>

              <div className="surface-1 rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold">#</TableHead>
                      <TableHead className="font-semibold">Product</TableHead>
                      <TableHead className="font-semibold text-right">Received Quantity</TableHead>
                      <TableHead className="font-semibold">UOM</TableHead>
                      <TableHead className="font-semibold">Batch</TableHead>
                      <TableHead className="font-semibold">Serial</TableHead>
                      <TableHead className="font-semibold text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewingGR.items ?? []).map((item, idx) => {
                      const product = resolveGrLineProduct(item, productMap);
                      return (
                      <TableRow key={item.id ?? `${item.productId}-${idx}`}>
                        <TableCell className="text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.description}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {product.productCode}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-xs">{item.uom}</TableCell>
                        <TableCell className="text-xs">{item.batchNumber?.trim() || '—'}</TableCell>
                        <TableCell className="text-xs">{item.serialNumber?.trim() || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {Number(item.lineValue ?? 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {viewingGR.status === 'DRAFT' && (
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewingGR(null);
                      openEdit(viewingGR);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => {
                      setViewingGR(null);
                      setPostTarget(viewingGR);
                    }}
                  >
                    <Send className="h-4 w-4" />
                    Post Receipt
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* GR Form Sheet */}
      <Sheet
        open={createOnly ? true : sheetOpen}
        onOpenChange={(open) => {
          if (!createOnly) {
            setSheetOpen(open);
            return;
          }
          if (!open && location.pathname === '/goods-receipts/new') {
            navigate('/goods-receipts');
          }
        }}
      >
        <SheetContent
          side="right"
          className={cn(
            'w-full overflow-y-auto',
            createOnly ? 'border-l-0 sm:w-full sm:max-w-none' : 'border-l sm:max-w-2xl',
          )}
        >
          <SheetHeader>
            <SheetTitle>
              {editingGR ? 'Edit Goods Receipt' : 'New Goods Receipt'}
            </SheetTitle>
            <SheetDescription>
              {editingGR
                ? `Editing ${editingGR.grNumber}`
                : 'Fill in the details to record incoming stock'}
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 space-y-5"
          >
            {/* Header fields */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="purchaseOrderId">Purchase Order</Label>
                <Controller
                  control={form.control}
                  name="purchaseOrderId"
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger id="purchaseOrderId">
                        <SelectValue placeholder="Select PO (Confirmed / Partially Received)" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligiblePoList.map((po) => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.poNumber} - {po.supplier}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierName">Supplier Name *</Label>
                <Input
                  id="supplierName"
                  {...form.register('supplierName')}
                  placeholder="Supplier name"
                />
                {form.formState.errors.supplierName && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.supplierName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="grDate">GR Date *</Label>
                <Input
                  id="grDate"
                  type="date"
                  {...form.register('grDate')}
                />
                {form.formState.errors.grDate && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.grDate.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplierRef">Supplier Ref</Label>
                <Input
                  id="supplierRef"
                  {...form.register('supplierRef')}
                  placeholder="Invoice/PO reference"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  {...form.register('remarks')}
                  placeholder="Optional notes"
                  rows={1}
                />
              </div>
            </div>

            {/* Items table */}
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Label className="text-base">Line Items *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ ...emptyItem })}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Row
                </Button>
              </div>

              {form.formState.errors.items?.message && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.items.message}
                </p>
              )}

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold w-[210px]">Product</TableHead>
                      <TableHead className="font-semibold text-right w-[100px]">Received Quantity</TableHead>
                      <TableHead className="font-semibold w-[70px]">UOM</TableHead>
                      <TableHead className="font-semibold w-[140px]">Batch Number</TableHead>
                      <TableHead className="font-semibold w-[140px]">Serial Number</TableHead>
                      <TableHead className="font-semibold text-right w-[100px]">Value</TableHead>
                      <TableHead className="w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell className="p-1.5">
                          <Controller
                            control={form.control}
                            name={`items.${index}.productId`}
                            render={({ field: f }) => (
                              <Select
                                value={f.value}
                                onValueChange={(v) => onProductSelect(index, v)}
                              >
                                <SelectTrigger
                                  className={cn(
                                    'h-8 text-xs',
                                    form.formState.errors.items?.[index]?.productId &&
                                      'border-destructive',
                                  )}
                                >
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {productList.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      <span className="font-mono text-[10px] mr-1.5">
                                        {p.productCode}
                                      </span>
                                      {p.description}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Input
                            type="number"
                            min="1"
                            className={cn(
                              'h-8 text-xs text-right',
                              form.formState.errors.items?.[index]?.quantity &&
                                'border-destructive',
                            )}
                            {...form.register(`items.${index}.quantity`)}
                          />
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Input
                            className="h-8 text-xs bg-muted/50"
                            readOnly
                            {...form.register(`items.${index}.uom`)}
                          />
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Input
                            className="h-8 text-xs"
                            placeholder="Batch no."
                            {...form.register(`items.${index}.batchNumber`)}
                          />
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Input
                            className="h-8 text-xs"
                            placeholder="Serial no."
                            {...form.register(`items.${index}.serialNumber`)}
                          />
                        </TableCell>
                        <TableCell className="p-1.5 text-right tabular-nums text-sm font-medium">
                          {lineValues[index]?.toFixed(2) ?? '0.00'}
                        </TableCell>
                        <TableCell className="p-1.5">
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Total */}
              <div className="flex justify-start sm:justify-end">
                <div className="rounded-lg border bg-muted/50 px-5 py-3 text-right">
                  <span className="text-sm text-muted-foreground mr-4">
                    Total Value
                  </span>
                  <span className="text-lg font-bold tabular-nums">
                    {totalValue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isMutating}>
                {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingGR ? 'Update Receipt' : 'Save as Draft'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Post Confirmation Dialog */}
      <AlertDialog
        open={!!postTarget}
        onOpenChange={(open) => !open && setPostTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post Goods Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to post{' '}
              <span className="font-medium text-foreground">
                {postTarget?.grNumber}
              </span>
              ? This will update inventory levels and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePost} disabled={postGR.isPending}>
              {postGR.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Post Receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goods Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.grNumber}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteGR.isPending}
            >
              {deleteGR.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
