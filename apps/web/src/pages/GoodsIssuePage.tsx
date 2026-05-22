import { useState, useMemo, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Trash2,
  Eye,
  Pencil,
  MoreHorizontal,
  Send,
  AlertTriangle,
  ArrowUpFromLine,
  PackageOpen,
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
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
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
  useGoodsIssues,
  useGoodsIssue,
  useCreateGoodsIssue,
  usePostGoodsIssue,
  useDeleteGoodsIssue,
  type GoodsIssue,
  type GoodsIssueStatus,
} from '@/hooks/use-goods-issues';
import { useProducts, type Product } from '@/hooks/use-products';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const giItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.coerce.number().positive('Quantity must be > 0'),
  uom: z.string().min(1),
});

const giFormSchema = z.object({
  giDate: z.string().min(1, 'Date is required'),
  issueReason: z.enum(['Retail sales', 'Damage', 'Transfer'], {
    required_error: 'Select an issue reason',
  }),
  remarks: z.string().optional(),
  items: z.array(giItemSchema).min(1, 'Add at least one item'),
});

type GIFormValues = z.infer<typeof giFormSchema>;

const ISSUE_REASONS = ['Retail sales', 'Damage', 'Transfer'] as const;
const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GoodsIssuePage() {
  const user = useAuthStore((s) => s.user);
  const shopId = user?.shopId ?? '';

  // ---- list filters ----
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | GoodsIssueStatus>('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [page, setPage] = useState(1);

  // ---- UI state ----
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingGI, setEditingGI] = useState<GoodsIssue | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: 'post' | 'delete'; id: string } | null>(null);

  // ---- queries ----
  const giQuery = useGoodsIssues({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter || undefined,
    shopId: shopId || undefined,
  });

  const giList = useMemo(() => {
    const raw = giQuery.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as GoodsIssue[];
    if (typeof raw === 'object' && 'rows' in raw) return (raw as { rows: GoodsIssue[] }).rows;
    if (typeof raw === 'object' && 'data' in raw) return (raw as { data: GoodsIssue[] }).data;
    return [];
  }, [giQuery.data]);

  const giTotal = useMemo(() => {
    const raw = giQuery.data;
    if (!raw || Array.isArray(raw)) return undefined;
    if (typeof raw === 'object' && 'total' in raw) return (raw as { total: number }).total;
    if (typeof raw === 'object' && 'meta' in raw) return (raw as { meta: { total: number } }).meta.total;
    return undefined;
  }, [giQuery.data]);

  const filteredByReason = useMemo(() => {
    if (!reasonFilter) return giList;
    return giList.filter((gi) => gi.issueReason === reasonFilter);
  }, [giList, reasonFilter]);

  const detailQuery = useGoodsIssue(detailId ?? '');
  const detailGI = detailId ? detailQuery.data : null;

  const productsQuery = useProducts({ shopId: shopId || undefined, isActive: true, limit: 100, page: 1 });
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
  const createMut = useCreateGoodsIssue();
  const postMut = usePostGoodsIssue();
  const deleteMut = useDeleteGoodsIssue();

  // ---- form ----
  const form = useForm<GIFormValues>({
    resolver: zodResolver(giFormSchema),
    defaultValues: {
      giDate: new Date().toISOString().slice(0, 10),
      issueReason: 'Retail sales',
      remarks: '',
      items: [{ productId: '', quantity: 0, uom: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  const openCreate = useCallback(() => {
    setEditingGI(null);
    form.reset({
      giDate: new Date().toISOString().slice(0, 10),
      issueReason: 'Retail sales',
      remarks: '',
      items: [{ productId: '', quantity: 0, uom: '' }],
    });
    setSheetOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (gi: GoodsIssue) => {
      setEditingGI(gi);
      form.reset({
        giDate: gi.giDate.slice(0, 10),
        issueReason: gi.issueReason as GIFormValues['issueReason'],
        remarks: gi.remarks ?? '',
        items: gi.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          uom: it.uom,
        })),
      });
      setSheetOpen(true);
    },
    [form],
  );

  // Stock validation helper
  function getStockStatus(productId: string, qty: number) {
    const prod = productMap.get(productId);
    if (!prod) return null;
    const available = prod.currentStock ?? 0;
    if (qty > available) return 'error' as const;
    if (qty > available * 0.8) return 'warning' as const;
    return 'ok' as const;
  }

  function hasStockErrors(values: GIFormValues) {
    return values.items.some((it) => {
      const prod = productMap.get(it.productId);
      if (!prod) return false;
      const available = prod.currentStock ?? 0;
      return it.quantity > available;
    });
  }

  async function handleSubmit(values: GIFormValues, post: boolean) {
    if (hasStockErrors(values)) {
      toast.error('One or more items exceed available stock');
      return;
    }

    try {
      const payload = {
        shopId,
        giDate: values.giDate,
        issueReason: values.issueReason,
        remarks: values.remarks ?? '',
        items: values.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          uom: it.uom,
        })),
      };

      const result = await createMut.mutateAsync(payload);

      if (post) {
        await postMut.mutateAsync(result.id);
        toast.success(`Goods issue ${result.giNumber} posted`);
      } else {
        toast.success(`Goods issue ${result.giNumber} saved as draft`);
      }
      setSheetOpen(false);
      form.reset();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message;
      toast.error(msg ?? 'Failed to create goods issue');
    }
  }

  async function handlePost(id: string) {
    try {
      await postMut.mutateAsync(id);
      toast.success('Goods issue posted successfully');
    } catch {
      toast.error('Failed to post goods issue');
    }
    setConfirmState(null);
  }

  async function handleDelete(id: string) {
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Goods issue deleted');
    } catch {
      toast.error('Failed to delete goods issue');
    }
    setConfirmState(null);
  }

  // ---- product select helpers ----
  const [productSearch, setProductSearch] = useState('');

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const s = productSearch.toLowerCase();
    return products.filter(
      (p) => p.description.toLowerCase().includes(s) || p.productCode.toLowerCase().includes(s),
    );
  }, [products, productSearch]);

  return (
    <AppLayout>
      <PageHeader
        title="Goods Issues"
        description="Manage goods issue documents"
        action={
          <Button onClick={openCreate} disabled={!shopId} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New Issue
          </Button>
        }
      />

      {/* Toolbar */}
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search GI number or reason..."
            className="w-full sm:w-64"
          />

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="POSTED">Posted</SelectItem>
            </SelectContent>
          </Select>

          <Select value={reasonFilter} onValueChange={(v) => { setReasonFilter(v === 'ALL' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All Reasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Reasons</SelectItem>
              {ISSUE_REASONS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {giQuery.isLoading ? (
          <LoadingSkeleton rows={6} columns={7} />
        ) : giQuery.isError ? (
          <div className="p-8 text-center text-sm text-destructive">
            Failed to load goods issues. Please try again.
          </div>
        ) : filteredByReason.length === 0 ? (
          <EmptyState
            icon={<PackageOpen className="h-12 w-12" />}
            title="No goods issues found"
            description="Create your first goods issue to get started."
            action={
              <Button variant="outline" onClick={openCreate} disabled={!shopId}>
                <Plus className="h-4 w-4" /> New Issue
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GI Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Issue Reason</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredByReason.map((gi) => (
                  <TableRow key={gi.id}>
                    <TableCell className="font-medium">{gi.giNumber}</TableCell>
                    <TableCell>{new Date(gi.giDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{gi.issueReason}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{gi.items?.length ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={gi.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(gi.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailId(gi.id)}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          {gi.status === 'DRAFT' && (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(gi)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setConfirmState({ type: 'post', id: gi.id })}>
                                <Send className="mr-2 h-4 w-4" /> Post
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setConfirmState({ type: 'delete', id: gi.id })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
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
            <DataTablePagination page={page} pageSize={PAGE_SIZE} total={giTotal} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* ---- CREATE / EDIT SHEET ---- */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{editingGI ? 'Edit Goods Issue' : 'New Goods Issue'}</SheetTitle>
            <SheetDescription>
              {editingGI ? `Editing ${editingGI.giNumber}` : 'Create a new goods issue document'}
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={form.handleSubmit((v) => handleSubmit(v, false))}
            className="mt-6 space-y-6"
          >
            {/* Header fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="giDate">Issue Date</Label>
                <Input id="giDate" type="date" {...form.register('giDate')} />
                {form.formState.errors.giDate && (
                  <p className="text-xs text-destructive">{form.formState.errors.giDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Issue Reason</Label>
                <Controller
                  control={form.control}
                  name="issueReason"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.issueReason && (
                  <p className="text-xs text-destructive">{form.formState.errors.issueReason.message}</p>
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
                  onClick={() => append({ productId: '', quantity: 0, uom: '' })}
                className="w-full sm:w-auto"
                >
                  <Plus className="h-3 w-3" /> Add Row
                </Button>
              </div>

              {form.formState.errors.items?.root && (
                <p className="mb-2 text-xs text-destructive">{form.formState.errors.items.root.message}</p>
              )}

              <div className="space-y-3">
                {fields.map((field, idx) => {
                  const watchedProduct = form.watch(`items.${idx}.productId`);
                  const watchedQty = form.watch(`items.${idx}.quantity`);
                  const prod = productMap.get(watchedProduct);
                  const available = prod?.currentStock ?? 0;
                  const stockStatus = watchedProduct && watchedQty > 0 ? getStockStatus(watchedProduct, watchedQty) : null;

                  return (
                    <Card key={field.id} className="p-3">
                      <div className="grid gap-3 sm:grid-cols-[1fr_100px_80px_40px]">
                        {/* Product */}
                        <div className="space-y-1">
                          <Label className="text-xs">Product</Label>
                          <Controller
                            control={form.control}
                            name={`items.${idx}.productId`}
                            render={({ field: f }) => (
                              <Select
                                value={f.value}
                                onValueChange={(v) => {
                                  f.onChange(v);
                                  const p = productMap.get(v);
                                  if (p) form.setValue(`items.${idx}.uom`, p.uom);
                                }}
                              >
                                <SelectTrigger>
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
                                      <span className="ml-2 text-muted-foreground">{p.description}</span>
                                      <span className="ml-2 text-xs text-emerald-600">
                                        (Stock: {p.currentStock ?? 0})
                                      </span>
                                    </SelectItem>
                                  ))}
                                  {filteredProducts.length === 0 && (
                                    <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                                      No products found
                                    </p>
                                  )}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {prod && (
                            <p className="text-xs text-muted-foreground">
                              Available: <span className="font-medium">{available}</span> {prod.uom}
                            </p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="space-y-1">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            {...form.register(`items.${idx}.quantity`, { valueAsNumber: true })}
                            className={cn(
                              stockStatus === 'error' && 'border-destructive focus-visible:ring-destructive',
                              stockStatus === 'warning' && 'border-amber-400 focus-visible:ring-amber-400',
                            )}
                          />
                          {stockStatus === 'warning' && (
                            <Badge variant="warning" className="mt-1 gap-1 text-[10px]">
                              <AlertTriangle className="h-3 w-3" /> &gt;80% stock
                            </Badge>
                          )}
                          {stockStatus === 'error' && (
                            <Badge variant="destructive" className="mt-1 gap-1 text-[10px]">
                              <AlertTriangle className="h-3 w-3" /> Exceeds stock
                            </Badge>
                          )}
                        </div>

                        {/* UOM (read-only) */}
                        <div className="space-y-1">
                          <Label className="text-xs">UOM</Label>
                          <Input readOnly {...form.register(`items.${idx}.uom`)} className="bg-muted" />
                        </div>

                        {/* Remove */}
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => fields.length > 1 && remove(idx)}
                            disabled={fields.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {form.formState.errors.items?.[idx]?.productId && (
                        <p className="mt-1 text-xs text-destructive">
                          {form.formState.errors.items[idx]?.productId?.message}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="submit"
                variant="outline"
                disabled={createMut.isPending || postMut.isPending}
              >
                {createMut.isPending ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button
                type="button"
                disabled={createMut.isPending || postMut.isPending}
                onClick={form.handleSubmit((v) => handleSubmit(v, true))}
              >
                <Send className="h-4 w-4" />
                {postMut.isPending ? 'Posting...' : 'Save & Post'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ---- DETAIL DIALOG ---- */}
      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <ArrowUpFromLine className="h-5 w-5" />
              {detailGI?.giNumber ?? 'Goods Issue'}
            </DialogTitle>
            <DialogDescription>Goods issue details and line items</DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <LoadingSkeleton rows={4} columns={3} />
          ) : detailGI ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date(detailGI.giDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Issue Reason</p>
                  <p className="font-medium">{detailGI.issueReason}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={detailGI.status} />
                </div>
              </div>

              {detailGI.remarks && (
                <div>
                  <p className="text-xs text-muted-foreground">Remarks</p>
                  <p className="text-sm">{detailGI.remarks}</p>
                </div>
              )}

              <Separator />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>UOM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailGI.items.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <span className="font-medium">{item.product?.productCode}</span>
                        <span className="ml-2 text-sm text-muted-foreground">{item.product?.description}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      <TableCell>{item.uom}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ---- CONFIRM DIALOGS ---- */}
      <ConfirmDialog
        open={confirmState?.type === 'post'}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title="Post Goods Issue"
        description="Posting will deduct stock for all items. This action cannot be undone."
        confirmLabel="Post"
        onConfirm={() => confirmState && handlePost(confirmState.id)}
        loading={postMut.isPending}
      />

      <ConfirmDialog
        open={confirmState?.type === 'delete'}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title="Delete Goods Issue"
        description="Are you sure you want to delete this draft goods issue? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => confirmState && handleDelete(confirmState.id)}
        loading={deleteMut.isPending}
      />
    </AppLayout>
  );
}
