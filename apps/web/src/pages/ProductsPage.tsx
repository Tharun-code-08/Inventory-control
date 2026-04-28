import { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  type Product,
  type ProductFilters,
} from '@/hooks/use-products';
import { useShops } from '@/hooks/use-shops';
import { useProductCategories } from '@/hooks/use-product-categories';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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

const UOM_OPTIONS = ['kg', 'pcs', 'liter', 'box', 'pack'] as const;
const PAGE_SIZE = 10;

const productSchema = z.object({
  productCode: z.string().min(1, 'Product code is required'),
  description: z.string().min(2, 'Description must be at least 2 characters'),
  category: z.string().min(1, 'Category is required'),
  purchasePrice: z.coerce.number().min(0, 'Must be 0 or more'),
  sellingPrice: z.coerce.number().min(0, 'Must be 0 or more'),
  openingStock: z.coerce.number().min(0, 'Must be 0 or more'),
  minStockLevel: z.coerce.number().min(0, 'Must be 0 or more'),
  reorderQty: z.coerce.number().min(0, 'Must be 0 or more'),
  uom: z.string().min(1, 'Unit of measure is required'),
  isActive: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const defaultValues: ProductFormValues = {
  productCode: '',
  description: '',
  category: '',
  purchasePrice: 0,
  sellingPrice: 0,
  openingStock: 0,
  minStockLevel: 0,
  reorderQty: 0,
  uom: 'pcs',
  isActive: true,
};

export function ProductsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = !user?.shopId;
  const shops = useShops();
  const shopList = shops.data ?? [];
  const defaultShopId = user?.shopId ?? shopList[0]?.id ?? '';
  const [selectedShopId, setSelectedShopId] = useState('');
  const shopId = user?.shopId ?? (selectedShopId || defaultShopId);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const filters: ProductFilters = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    shopId: shopId || undefined,
  };

  const { data, isLoading, isError } = useProducts(filters);
  const { categories: categoryConfig } = useProductCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const items: Product[] = data?.items ?? [];
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

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });
  const [skuNumber, setSkuNumber] = useState('');

  const selectedCategory = form.watch('category');
  const currentPrefix =
    categoryConfig.find((c) => c.name === selectedCategory)?.skuPrefix ?? 'PRD';

  const composedProductCode = `${currentPrefix}${skuNumber}`;

  useEffect(() => {
    if (!editingProduct) {
      form.setValue('productCode', composedProductCode, { shouldValidate: true });
    }
  }, [composedProductCode, editingProduct, form]);

  const openCreate = () => {
    setEditingProduct(null);
    form.reset(defaultValues);
    setSkuNumber('');
    setSheetOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      productCode: product.productCode,
      description: product.description,
      category: product.category,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      openingStock: product.openingStock,
      minStockLevel: product.minStockLevel,
      reorderQty: product.reorderQty ?? 0,
      uom: product.uom,
      isActive: product.isActive,
    });
    const matchedPrefix = categoryConfig.find((c) => product.productCode.startsWith(c.skuPrefix))?.skuPrefix ?? '';
    const suffix = matchedPrefix ? product.productCode.slice(matchedPrefix.length) : '';
    setSkuNumber(/^\d+$/.test(suffix) ? suffix : '');
    setSheetOpen(true);
  };

  const onSubmit = async (values: ProductFormValues) => {
    try {
      const resolvedShopId = user?.shopId ?? (selectedShopId || defaultShopId);
      if (!resolvedShopId) {
        toast.error('Please select a shop first');
        return;
      }
      const finalProductCode = editingProduct ? values.productCode : composedProductCode;
      if (!editingProduct && !/^\d+$/.test(skuNumber)) {
        toast.error('Enter numeric product code digits');
        return;
      }
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, ...values, productCode: finalProductCode });
        toast.success('Product updated successfully');
      } else {
        await createProduct.mutateAsync({ ...values, productCode: finalProductCode, shopId: resolvedShopId });
        toast.success('Product created successfully');
      }
      setSheetOpen(false);
      form.reset(defaultValues);
      setEditingProduct(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message ?? 'Something went wrong';
      toast.error(msg);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    const newStatus = !product.isActive;
    try {
      await updateProduct.mutateAsync({ id: product.id, isActive: newStatus });
      toast.success(
        `${product.description} ${newStatus ? 'activated' : 'deactivated'}`,
      );
    } catch {
      toast.error('Failed to update product status');
    }
    setDeactivateTarget(null);
  };

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;

    try {
      await deleteProduct.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.description} deleted successfully`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message ?? 'Failed to delete product';
      toast.error(msg);
    }
  };

  const onStatusToggleClick = (product: Product) => {
    if (product.isActive) {
      setDeactivateTarget(product);
    } else {
      handleToggleStatus(product);
    }
  };

  const isMutating = createProduct.isPending || updateProduct.isPending;

  return (
    <AppLayout active="Products">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-sm text-muted-foreground">
              Manage your product catalog and inventory levels
            </p>
          </div>
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px] sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by code or description..."
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
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryConfig.map((c) => (
                <SelectItem key={c.code} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && shopList.length > 0 && (
            <Select
              value={selectedShopId || defaultShopId || 'all'}
              onValueChange={(v) => {
                setSelectedShopId(v === 'all' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Shop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shops</SelectItem>
                {shopList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.shopName} ({s.shopNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table Card */}
        <div className="rounded-xl border bg-card shadow-sm">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <p className="text-sm font-medium text-destructive">
                Failed to load products
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please try refreshing the page
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No products found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {debouncedSearch || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first product'}
              </p>
              {!debouncedSearch && categoryFilter === 'all' && statusFilter === 'all' && (
                <Button size="sm" className="mt-4" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold text-right">Buy Price</TableHead>
                    <TableHead className="font-semibold text-right">Sell Price</TableHead>
                    <TableHead className="font-semibold text-right">Stock</TableHead>
                    <TableHead className="font-semibold text-right">Min Stock</TableHead>
                    <TableHead className="font-semibold">Unit</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((product) => {
                    const isLowStock =
                      product.currentStock !== undefined &&
                      product.currentStock < product.minStockLevel;

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-xs">
                          {product.productCode}
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {product.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {product.purchasePrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {product.sellingPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="tabular-nums">
                              {product.currentStock ?? '—'}
                            </span>
                            {isLowStock && (
                              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                <AlertTriangle className="h-3 w-3 mr-0.5" />
                                Low
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {product.minStockLevel}
                        </TableCell>
                        <TableCell className="text-xs">{product.uom}</TableCell>
                        <TableCell>
                          <Badge variant={product.isActive ? 'success' : 'outline'}>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(product)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(product)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <Switch
                              checked={product.isActive}
                              onCheckedChange={() => onStatusToggleClick(product)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                  of <span className="font-medium">{meta.total}</span> products
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

      {/* Product Form Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </SheetTitle>
            <SheetDescription>
              {editingProduct
                ? `Update details for ${editingProduct.productCode}`
                : 'Fill in the details below to create a new product'}
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 space-y-5"
          >
            {isAdmin && !editingProduct && (
              <div className="space-y-2">
                <Label>Shop *</Label>
                <Select
                  value={selectedShopId || defaultShopId}
                  onValueChange={setSelectedShopId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {shopList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.shopName} ({s.shopNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {shopList.length === 0 && (
                  <p className="text-xs text-destructive">
                    No shops available. Create a shop first.
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="productCode">Product Code *</Label>
                {editingProduct ? (
                  <Input id="productCode" {...form.register('productCode')} disabled />
                ) : (
                  <div className="grid grid-cols-[110px_1fr] gap-2">
                    <Input value={currentPrefix} disabled />
                    <Input
                      id="productCode"
                      inputMode="numeric"
                      placeholder="numbers only"
                      value={skuNumber}
                      onChange={(e) => setSkuNumber(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                )}
                {!editingProduct && (
                  <p className="text-xs text-muted-foreground">Auto prefix + numeric suffix only (example: {currentPrefix}001)</p>
                )}
                {form.formState.errors.productCode && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.productCode.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="uom">Unit of Measure *</Label>
                <Controller
                  control={form.control}
                  name="uom"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {UOM_OPTIONS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.uom && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.uom.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                {...form.register('description')}
                placeholder="Product description"
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryConfig.map((c) => (
                        <SelectItem key={c.code} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.category && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.category.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Purchase Price *</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('purchasePrice')}
                />
                {form.formState.errors.purchasePrice && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.purchasePrice.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Selling Price *</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('sellingPrice')}
                />
                {form.formState.errors.sellingPrice && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.sellingPrice.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="openingStock">Opening Stock</Label>
                <Input
                  id="openingStock"
                  type="number"
                  min="0"
                  {...form.register('openingStock')}
                />
                {form.formState.errors.openingStock && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.openingStock.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStockLevel">Min Stock Level</Label>
                <Input
                  id="minStockLevel"
                  type="number"
                  min="0"
                  {...form.register('minStockLevel')}
                />
                {form.formState.errors.minStockLevel && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.minStockLevel.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderQty">Reorder Qty</Label>
                <Input
                  id="reorderQty"
                  type="number"
                  min="0"
                  {...form.register('reorderQty')}
                />
                {form.formState.errors.reorderQty && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.reorderQty.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active Status
                </Label>
                <p className="text-xs text-muted-foreground">
                  Inactive products won't appear in transactions
                </p>
              </div>
              <Controller
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    id="isActive"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

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
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.description}
              </span>
              {' '}from the database. Products with transaction history cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProduct.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
              disabled={deleteProduct.isPending}
              onClick={handleDeleteProduct}
            >
              {deleteProduct.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-medium text-foreground">
                {deactivateTarget?.description}
              </span>
              ? It will no longer appear in new transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
              onClick={() => deactivateTarget && handleToggleStatus(deactivateTarget)}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
