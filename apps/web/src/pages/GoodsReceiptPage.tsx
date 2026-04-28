import { useState, useCallback, useMemo } from 'react';
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

const PAGE_SIZE = 10;

const grItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.coerce.number().min(1, 'Qty must be at least 1'),
  uom: z.string().min(1, 'UOM is required'),
  purchaseRate: z.coerce.number().min(0, 'Rate must be 0 or more'),
});

const grFormSchema = z.object({
  supplierName: z.string().min(1, 'Supplier name is required'),
  grDate: z.string().min(1, 'Date is required'),
  supplierRef: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(grItemSchema).min(1, 'At least one item is required'),
});

type GRFormValues = z.infer<typeof grFormSchema>;

const emptyItem = { productId: '', quantity: 1, uom: '', purchaseRate: 0 };

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function GoodsReceiptPage() {
  const user = useAuthStore((s) => s.user);
  const shopId = user?.shopId ?? '';

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
    limit: 500,
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
      supplierRef: '',
      remarks: '',
      items: [{ ...emptyItem }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items');
  const lineValues = watchedItems.map((item) => (item.quantity || 0) * (item.purchaseRate || 0));
  const totalValue = lineValues.reduce((sum, v) => sum + v, 0);

  const openCreate = () => {
    setEditingGR(null);
    form.reset({
      supplierName: '',
      grDate: todayISO(),
      supplierRef: '',
      remarks: '',
      items: [{ ...emptyItem }],
    });
    setSheetOpen(true);
  };

  const openEdit = (gr: GoodsReceipt) => {
    setEditingGR(gr);
    form.reset({
      supplierName: gr.supplierName,
      grDate: gr.grDate.split('T')[0],
      supplierRef: gr.supplierRef || '',
      remarks: gr.remarks || '',
      items: gr.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        uom: item.uom,
        purchaseRate: item.purchaseRate,
      })),
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
      if (editingGR) {
        await updateGR.mutateAsync({
          id: editingGR.id,
          shopId,
          grDate: values.grDate,
          supplierName: values.supplierName,
          supplierRef: values.supplierRef,
          remarks: values.remarks,
          items: values.items,
        });
        toast.success('Goods receipt updated successfully');
      } else {
        await createGR.mutateAsync({
          shopId,
          grDate: values.grDate,
          supplierName: values.supplierName,
          supplierRef: values.supplierRef,
          remarks: values.remarks,
          items: values.items,
        });
        toast.success('Goods receipt created successfully');
      }
      setSheetOpen(false);
      setEditingGR(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message ?? 'Something went wrong';
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
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Goods Receipts</h1>
            <p className="text-sm text-muted-foreground">
              Record incoming stock from suppliers
            </p>
          </div>
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New Receipt
          </Button>
        </div>

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
            <SelectTrigger className="w-full sm:w-[140px]">
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
        <div className="rounded-xl border bg-card shadow-sm">
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
                <Button size="sm" className="mt-4" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  New Receipt
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
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
                        {new Date(gr.grDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium max-w-[180px] truncate">
                        {gr.supplierName}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{gr.items.length}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {gr.totalValue.toFixed(2)}
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
      </div>

      {/* GR Detail Dialog */}
      <Dialog
        open={!!viewingGR}
        onOpenChange={(open) => !open && setViewingGR(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
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
              <div className="grid gap-4 rounded-lg border p-4 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Supplier</span>
                  <p className="font-medium">{viewingGR.supplierName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">
                    {new Date(viewingGR.grDate).toLocaleDateString()}
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
                    {viewingGR.totalValue.toFixed(2)}
                  </p>
                </div>
                {viewingGR.remarks && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Remarks</span>
                    <p className="font-medium">{viewingGR.remarks}</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold">#</TableHead>
                      <TableHead className="font-semibold">Product</TableHead>
                      <TableHead className="font-semibold text-right">Qty</TableHead>
                      <TableHead className="font-semibold">UOM</TableHead>
                      <TableHead className="font-semibold text-right">Rate</TableHead>
                      <TableHead className="font-semibold text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingGR.items.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product.description}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {item.product.productCode}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-xs">{item.uom}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.purchaseRate.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {item.lineValue.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
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
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
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
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2">
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
                      <TableHead className="font-semibold w-[240px]">Product</TableHead>
                      <TableHead className="font-semibold text-right w-[80px]">Qty</TableHead>
                      <TableHead className="font-semibold w-[70px]">UOM</TableHead>
                      <TableHead className="font-semibold text-right w-[100px]">Rate</TableHead>
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
                            type="number"
                            step="0.01"
                            min="0"
                            className={cn(
                              'h-8 text-xs text-right',
                              form.formState.errors.items?.[index]?.purchaseRate &&
                                'border-destructive',
                            )}
                            {...form.register(`items.${index}.purchaseRate`)}
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
