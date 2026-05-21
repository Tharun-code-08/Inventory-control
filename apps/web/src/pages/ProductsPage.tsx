import { useState, useCallback, useEffect, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller, useFieldArray, useWatch, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
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
import { useStorageLocations } from '@/hooks/use-storage-locations';
import { mapProductFormToPayload, type ProductFormValues } from '@/lib/payload-mappers';
import { isAdminUser, isShopOnlyUser, productListShopId } from '@/lib/shop-scope';

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

/** Lets users clear a numeric field while typing; commits 0 on blur if left empty. */
function PlantNumericInput({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
}) {
  const [text, setText] = useState(String(value ?? 0));

  useEffect(() => {
    setText(String(value ?? 0));
  }, [value]);

  return (
    <Input
      type="number"
      min={min}
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        if (next !== '' && !Number.isNaN(Number(next))) {
          onChange(Number(next));
        }
      }}
      onBlur={() => {
        if (text === '' || Number.isNaN(Number(text))) {
          setText('0');
          onChange(0);
          return;
        }
        const n = Number(text);
        const clamped = n < min ? min : n;
        setText(String(clamped));
        onChange(clamped);
      }}
    />
  );
}

const UOM_OPTIONS = [
  { value: 'dz', label: 'Dozen (dz)' },
  { value: 'drm', label: 'Drum (drm)' },
  { value: 'ea', label: 'Each (ea)' },
  { value: 'grs', label: 'Gross (grs)' },
  { value: 'pk', label: 'Pack (pk)' },
  { value: 'pr', label: 'Pair (pr)' },
  { value: 'plt', label: 'Pallet (plt)' },
  { value: 'pcs', label: 'Piece (pcs)' },
  { value: 'roll', label: 'Roll (roll)' },
  { value: 'set', label: 'Set (set)' },
  { value: 'sht', label: 'Sheet (sht)' },
  { value: 'unit', label: 'Unit (unit)' },
  { value: 'day', label: 'Day (day)' },
  { value: 'hr', label: 'Hour (hr)' },
  { value: 'mon', label: 'Month (mon)' },
  { value: 'bbl', label: 'Barrel (bbl)' },
  { value: 'm3', label: 'Cubic Meter (m3)' },
  { value: 'floz', label: 'Fluid Ounce (fl oz)' },
  { value: 'gal', label: 'Gallon (gal)' },
  { value: 'l', label: 'Liter (L)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'mt', label: 'Metric Ton (MT)' },
  { value: 'mg', label: 'Milligram (mg)' },
  { value: 'oz', label: 'Ounce (oz)' },
] as const;
const PAGE_SIZE = 10;

const productPlantSchema = z
  .object({
    shopId: z.string().min(1, 'Plant is required'),
    storageLocationId: z.string().optional(),
    openingStock: z.coerce.number().min(0, 'Must be 0 or more'),
    minStockLevel: z.coerce.number().min(0, 'Must be 0 or more'),
    maxStockLevel: z
      .union([z.coerce.number().min(0), z.literal(''), z.null(), z.undefined()])
      .transform((v) => (v === '' || v === undefined || v === null ? null : Number(v)))
      .nullable()
      .optional(),
    reorderQty: z
      .union([z.coerce.number().min(0), z.literal(''), z.null(), z.undefined()])
      .transform((v) => (v === '' || v === undefined || v === null ? null : Number(v)))
      .nullable()
      .optional(),
    isActive: z.boolean().optional().default(true),
  })
  .refine(
    (plant) =>
      plant.maxStockLevel == null || plant.maxStockLevel >= plant.minStockLevel,
    { message: 'Max ≥ Min', path: ['maxStockLevel'] },
  );

const productSpecSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const productSchema = z.object({
  productCode: z.string().min(1, 'Product code is required'),
  description: z.string().min(2, 'Description must be at least 2 characters'),
  category: z.string().min(1, 'Category is required'),
  materialGroup: z.string().optional(),
  drawingReference: z.string().optional(),
  purchasePrice: z.coerce.number().min(0, 'Must be 0 or more'),
  sellingPrice: z.coerce.number().min(0, 'Must be 0 or more'),
  uom: z.string().min(1, 'Unit of measure is required'),
  isActive: z.boolean(),
  plants: z.array(productPlantSchema).min(1, 'At least one plant assignment is required'),
  specifications: z.array(productSpecSchema),
});

type FormShape = z.infer<typeof productSchema>;

const emptyPlant: FormShape['plants'][number] = {
  shopId: '',
  storageLocationId: '',
  openingStock: 0,
  minStockLevel: 0,
  maxStockLevel: null,
  reorderQty: null,
  isActive: true,
};

const defaultValues: FormShape = {
  productCode: '',
  description: '',
  category: '',
  materialGroup: '',
  drawingReference: '',
  purchasePrice: 0,
  sellingPrice: 0,
  uom: 'pcs',
  isActive: true,
  plants: [emptyPlant],
  specifications: [],
};

/**
 * One row of the Plant & Storage Location Assignment table. Lifted into its
 * own component so each row owns its `useStorageLocations(shopId)` query —
 * picking a plant in row N must only reload row N's location dropdown.
 *
 * The row exposes two distinct destructive actions:
 *   - Active toggle  -> per-plant soft-deactivate (assignment is preserved
 *     on the master record but rejected by transactions like new POs).
 *   - Trash button   -> remove the assignment from the form. On submit the
 *     API hard-deletes the row when no history exists, otherwise gracefully
 *     falls back to soft-deactivate.
 */
type PlantAssignmentRowProps = {
  control: Control<FormShape>;
  index: number;
  shopOptions: Array<{ id: string; shopName: string; shopNumber: string }>;
  takenShopIds: Set<string>;
  onRemove: () => void;
  removable: boolean;
  errors: Record<string, { message?: string } | undefined> | undefined;
};

function PlantAssignmentRow({
  control,
  index,
  shopOptions,
  takenShopIds,
  onRemove,
  removable,
  errors,
}: PlantAssignmentRowProps) {
  const watchedShopId = useWatch({ control, name: `plants.${index}.shopId` });
  const watchedActive = useWatch({ control, name: `plants.${index}.isActive` }) ?? true;
  const { data: locations = [], isLoading: isLoadingLocations } = useStorageLocations(
    watchedShopId || undefined,
  );
  const activeLocations = locations.filter((l) => l.isActive);

  const availableShops = shopOptions.filter(
    (s) => s.id === watchedShopId || !takenShopIds.has(s.id),
  );

  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 transition-opacity',
        !watchedActive && 'border-dashed bg-slate-100/70 opacity-70',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-slate-700">Plant {index + 1}</span>
          {!watchedActive && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
              Inactive
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label
              htmlFor={`plant-${index}-active`}
              className="cursor-pointer text-xs text-slate-600"
            >
              Active
            </Label>
            <Controller
              control={control}
              name={`plants.${index}.isActive`}
              render={({ field }) => (
                <Switch
                  id={`plant-${index}-active`}
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive disabled:opacity-30"
            onClick={onRemove}
            disabled={!removable}
            aria-label="Remove plant"
            title="Delete this plant assignment"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr_1fr_1fr]">
        <div className="space-y-1">
          <Label className="text-xs">Plant *</Label>
          <Controller
            control={control}
            name={`plants.${index}.shopId`}
            render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plant" />
                </SelectTrigger>
                <SelectContent>
                  {availableShops.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.shopName} ({s.shopNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors?.shopId?.message && (
            <p className="text-xs text-destructive">{errors.shopId.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Storage Location</Label>
          <Controller
            control={control}
            name={`plants.${index}.storageLocationId`}
            render={({ field }) => (
              <Select
                value={field.value || ''}
                onValueChange={field.onChange}
                disabled={!watchedShopId || isLoadingLocations || activeLocations.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !watchedShopId
                        ? 'Pick a plant first'
                        : isLoadingLocations
                          ? 'Loading…'
                          : activeLocations.length === 0
                            ? 'None available'
                            : 'Select location'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Stock</Label>
          <Controller
            control={control}
            name={`plants.${index}.openingStock`}
            render={({ field }) => (
              <PlantNumericInput
                value={field.value ?? 0}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Min Stock</Label>
          <Controller
            control={control}
            name={`plants.${index}.minStockLevel`}
            render={({ field }) => (
              <PlantNumericInput
                value={field.value ?? 0}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Max Stock</Label>
          <Controller
            control={control}
            name={`plants.${index}.maxStockLevel`}
            render={({ field }) => (
              <Input
                type="number"
                min="0"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
              />
            )}
          />
          {errors?.maxStockLevel?.message && (
            <p className="text-xs text-destructive">{errors.maxStockLevel.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminUser(user);
  const shops = useShops();
  const shopList = shops.data ?? [];
  const defaultShopId = isShopOnlyUser(user) ? user!.shopId! : '';
  const [listShopFilter, setListShopFilter] = useState<string>('all');
  const listShopId = productListShopId(user, listShopFilter);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  // Confirmation index for plant removal. Null means no dialog open.
  // We only prompt when the row corresponds to a plant that already exists
  // on the edited product, since dropping a fresh row before save is harmless.
  const [pendingPlantRemoval, setPendingPlantRemoval] = useState<{
    index: number;
    existingShopId: string | null;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importDryRun, setImportDryRun] = useState(true);
  const [lastImportFailures, setLastImportFailures] = useState<string[]>([]);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const filters: ProductFilters = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    shopId: listShopId,
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

  const form = useForm<FormShape>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });
  const [skuNumber, setSkuNumber] = useState('');

  const plantsArray = useFieldArray({ control: form.control, name: 'plants' });
  const specsArray = useFieldArray({ control: form.control, name: 'specifications' });
  const watchedPlants = useWatch({ control: form.control, name: 'plants' }) ?? [];
  const takenShopIds = new Set(watchedPlants.map((p) => p?.shopId).filter(Boolean) as string[]);
  const allPlantsAssigned = shopList.length > 0 && watchedPlants.length >= shopList.length;

  // When editing, removing a row that's already saved is destructive — the
  // server will hard-delete or deactivate. Prompt before doing it. For freshly
  // appended rows (no matching shopId on the original product), drop silently.
  const requestPlantRemoval = (index: number) => {
    const plantShopId = watchedPlants[index]?.shopId ?? '';
    const existsOnServer =
      !!editingProduct &&
      !!plantShopId &&
      editingProduct.plants.some((plant) => plant.shopId === plantShopId);
    if (existsOnServer) {
      setPendingPlantRemoval({ index, existingShopId: plantShopId });
    } else {
      plantsArray.remove(index);
    }
  };

  const confirmPlantRemoval = () => {
    if (!pendingPlantRemoval) return;
    plantsArray.remove(pendingPlantRemoval.index);
    setPendingPlantRemoval(null);
  };

  const pendingPlantShopName = pendingPlantRemoval?.existingShopId
    ? shopList.find((s) => s.id === pendingPlantRemoval.existingShopId)?.shopName ?? 'this plant'
    : 'this plant';

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
    // Admins must explicitly pick a plant; auto-selecting the first shop often
    // assigns the wrong plant so the product never appears under the intended filter.
    const defaultPlantShopId = isShopOnlyUser(user) ? user!.shopId! : '';
    form.reset({
      ...defaultValues,
      plants: [
        {
          ...emptyPlant,
          shopId: defaultPlantShopId,
        },
      ],
    });
    setSkuNumber('');
    setSheetOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      productCode: product.productCode,
      description: product.description,
      category: product.category,
      materialGroup: product.materialGroup ?? '',
      drawingReference: product.drawingReference ?? '',
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      uom: product.uom,
      isActive: product.isActive,
      plants:
        product.plants.length > 0
          ? product.plants.map((plant) => ({
              shopId: plant.shopId,
              storageLocationId: plant.storageLocationId ?? '',
              openingStock: plant.openingStock,
              minStockLevel: plant.minStockLevel,
              maxStockLevel: plant.maxStockLevel ?? null,
              reorderQty: plant.reorderQty ?? null,
              isActive: plant.isActive,
            }))
          : [emptyPlant],
      specifications: product.specifications.map((spec) => ({
        label: spec.label,
        value: spec.value,
      })),
    });
    const matchedPrefix = categoryConfig.find((c) => product.productCode.startsWith(c.skuPrefix))?.skuPrefix ?? '';
    const suffix = matchedPrefix ? product.productCode.slice(matchedPrefix.length) : '';
    setSkuNumber(/^\d+$/.test(suffix) ? suffix : '');
    setSheetOpen(true);
  };

  const onSubmit = async (rawValues: FormShape) => {
    try {
      const finalProductCode = editingProduct ? rawValues.productCode : composedProductCode;
      if (!editingProduct && !/^\d+$/.test(skuNumber)) {
        toast.error('Enter numeric product code digits');
        return;
      }
      if (!rawValues.plants.some((p) => p.shopId?.trim())) {
        toast.error('Select a plant — products only appear for shops they are assigned to');
        return;
      }
      const values: ProductFormValues = {
        productCode: finalProductCode,
        description: rawValues.description,
        category: rawValues.category,
        materialGroup: rawValues.materialGroup,
        drawingReference: rawValues.drawingReference,
        purchasePrice: rawValues.purchasePrice,
        sellingPrice: rawValues.sellingPrice,
        uom: rawValues.uom,
        isActive: rawValues.isActive,
        plants: rawValues.plants.map((p) => ({
          shopId: p.shopId,
          storageLocationId: p.storageLocationId,
          openingStock: p.openingStock,
          minStockLevel: p.minStockLevel,
          maxStockLevel: p.maxStockLevel ?? null,
          reorderQty: p.reorderQty ?? null,
          isActive: p.isActive,
        })),
        specifications: rawValues.specifications.filter(
          (spec) => spec.label.trim() && spec.value.trim(),
        ),
      };

      if (editingProduct) {
        const payload = mapProductFormToPayload({
          values,
          finalProductCode,
          mode: 'update',
        });
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          ...payload,
        });
        toast.success('Product updated successfully');
      } else {
        const payload = mapProductFormToPayload({
          values,
          finalProductCode,
          mode: 'create',
        });
        const created = await createProduct.mutateAsync(payload);
        const plantName =
          shopList.find((s) => s.id === created.plants[0]?.shopId)?.shopName ?? 'selected plant';
        toast.success(
          `Product ${created.productCode} created for ${plantName}. It appears in the list below.`,
        );
        setPage(1);
        setSearch('');
        setDebouncedSearch('');
        setCategoryFilter('all');
        setStatusFilter('all');
        if (!isShopOnlyUser(user)) {
          setListShopFilter('all');
        }
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

  const downloadProductTemplate = () => {
    const headings = [
      'Shop',
      'Product Code',
      'Description',
      'Category',
      'Purchase Price',
      'Selling Price',
      'Opening Stock',
      'Min Stock Level',
      'Reorder Qty',
      'Unit of Measure',
      'Active Status',
    ];
    const sampleRow = {
      Shop: user?.shopId ? '' : shopList[0]?.shopNumber ?? '',
      'Product Code': 'PRD001',
      Description: 'Sample Product',
      Category: categoryConfig[0]?.name ?? '',
      'Purchase Price': 100,
      'Selling Price': 120,
      'Opening Stock': 50,
      'Min Stock Level': 10,
      'Reorder Qty': 20,
      'Unit of Measure': 'pcs',
      'Active Status': 'true',
    };
    const worksheet = XLSX.utils.json_to_sheet([sampleRow], { header: headings });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, 'products-bulk-template.xlsx');
  };

  const parseBoolean = (value: unknown, fallback = true) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return fallback;
    return ['true', 'yes', '1', 'active'].includes(normalized);
  };

  const getByNormalizedKey = (row: Record<string, unknown>, key: string) => {
    const target = key.toLowerCase().replace(/\s+/g, '');
    const entry = Object.entries(row).find(
      ([k]) => k.toLowerCase().replace(/\s+/g, '') === target,
    );
    return entry?.[1];
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fallbackShopId = user?.shopId ?? defaultShopId;
    if (!fallbackShopId) {
      toast.error('Select a shop before importing products');
      event.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        toast.error('No worksheet found in the uploaded file');
        return;
      }

      const worksheet = workbook.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
      if (rows.length === 0) {
        toast.error('Excel file is empty');
        return;
      }

      let successCount = 0;
      const failures: string[] = [];
      const seenCodes = new Set<string>();
      // Pre-build a set of productCodes from rows currently visible so we
      // can warn on obvious duplicates before sending. The API is the
      // source of truth on uniqueness — productCode is now globally unique.
      const existingCodes = new Set(
        items.map((p) => (p.productCode || '').toLowerCase()),
      );

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const rowNumber = index + 2;
        try {
          const code = String(getByNormalizedKey(row, 'Product Code') ?? '').trim();
          const description = String(getByNormalizedKey(row, 'Description') ?? '').trim();
          const category = String(getByNormalizedKey(row, 'Category') ?? '').trim();
          const uom = String(getByNormalizedKey(row, 'Unit of Measure') ?? '').trim();
          const purchasePrice = Number(getByNormalizedKey(row, 'Purchase Price') ?? 0);
          const sellingPrice = Number(getByNormalizedKey(row, 'Selling Price') ?? 0);
          const openingStock = Number(getByNormalizedKey(row, 'Opening Stock') ?? 0);
          const minStockLevel = Number(getByNormalizedKey(row, 'Min Stock Level') ?? 0);
          const reorderQty = Number(getByNormalizedKey(row, 'Reorder Qty') ?? 0);
          const isActive = parseBoolean(getByNormalizedKey(row, 'Active Status'), true);

          const shopCell = String(getByNormalizedKey(row, 'Shop') ?? '').trim();
          const resolvedShopId =
            user?.shopId ||
            (shopCell
              ? shopList.find(
                  (shop) =>
                    shop.id === shopCell ||
                    shop.shopNumber.toLowerCase() === shopCell.toLowerCase() ||
                    shop.shopName.toLowerCase() === shopCell.toLowerCase(),
                )?.id
              : undefined) ||
            fallbackShopId;

          if (!resolvedShopId) throw new Error('Shop is missing');
          if (!code) throw new Error('Product Code is required');
          if (!description) throw new Error('Description is required');
          if (!category) throw new Error('Category is required');
          if (!uom) throw new Error('Unit of Measure is required');
          if (!Number.isFinite(purchasePrice) || purchasePrice < 0) throw new Error('Invalid Purchase Price');
          if (!Number.isFinite(sellingPrice) || sellingPrice < 0) throw new Error('Invalid Selling Price');
          if (!Number.isFinite(openingStock) || openingStock < 0) throw new Error('Invalid Opening Stock');
          if (!Number.isFinite(minStockLevel) || minStockLevel < 0) throw new Error('Invalid Min Stock Level');
          if (!Number.isFinite(reorderQty) || reorderQty < 0) throw new Error('Invalid Reorder Qty');

          const dedupeKey = code.toLowerCase();
          if (seenCodes.has(dedupeKey)) throw new Error('Duplicate Product Code in upload file');
          if (existingCodes.has(dedupeKey)) throw new Error('Product Code already exists');
          seenCodes.add(dedupeKey);

          if (importDryRun) {
            successCount += 1;
            continue;
          }

          await createProduct.mutateAsync({
            productCode: code,
            description,
            category,
            purchasePrice,
            sellingPrice,
            uom,
            isActive,
            plants: [
              {
                shopId: resolvedShopId,
                openingStock,
                minStockLevel,
                reorderQty: reorderQty || undefined,
              },
            ],
          });
          successCount += 1;
        } catch (err: unknown) {
          const message =
            (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
            (err as Error).message;
          failures.push(`Row ${rowNumber}: ${message || 'Failed to import'}`);
        }
      }

      if (successCount > 0) {
        toast.success(importDryRun ? `${successCount} row(s) validated successfully (dry run)` : `${successCount} product(s) imported successfully`);
      }
      if (failures.length > 0) {
        setLastImportFailures(failures);
        toast.error(`Failed rows: ${failures.length}. ${failures.slice(0, 3).join(' | ')}`);
      } else {
        setLastImportFailures([]);
      }
    } catch {
      toast.error('Failed to process Excel file');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  return (
    <AppLayout active="Products">
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Products</h1>
            <p className="text-sm text-slate-500">
              Manage your product catalog and inventory levels
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button type="button" variant="outline" onClick={downloadProductTemplate} className="w-full sm:w-auto">
              Download Template
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isImporting}
              onClick={() => importInputRef.current?.click()}
              className="w-full sm:w-auto"
            >
              {isImporting ? 'Importing...' : 'Upload Excel'}
            </Button>
            <Button
              type="button"
              variant={importDryRun ? 'default' : 'outline'}
              title="Applies to Excel upload only, not Add Product"
              onClick={() => setImportDryRun((v) => !v)}
              className="w-full sm:w-auto"
            >
              {importDryRun ? 'Excel dry run: ON' : 'Excel dry run: OFF'}
            </Button>
            <Button onClick={openCreate} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>
        {lastImportFailures.length > 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">Last import had {lastImportFailures.length} failed row(s). First error: {lastImportFailures[0]}</p>
        ) : null}

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
              value={listShopFilter}
              onValueChange={(v) => {
                setListShopFilter(v);
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
        {isAdmin && listShopFilter !== 'all' && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Showing products assigned to{' '}
            <span className="font-medium">
              {shopList.find((s) => s.id === listShopFilter)?.shopName ?? 'one plant'}
            </span>{' '}
            only. New products for other plants are hidden — switch to{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                setListShopFilter('all');
                setPage(1);
              }}
            >
              All Shops
            </button>{' '}
            to see everything.
          </p>
        )}

        {/* Table Card */}
        <div className="surface-1 rounded-xl shadow-sm">
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
                <p className="mt-1 text-xs text-muted-foreground">
                Please try refreshing the page
              </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
                  Retry
                </Button>
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
              <Table className="text-[13px]">
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold text-right">Buy Price</TableHead>
                    <TableHead className="font-semibold text-right">Sell Price</TableHead>
                    <TableHead className="font-semibold text-right">Stock</TableHead>
                    <TableHead className="font-semibold">Plants</TableHead>
                    <TableHead className="font-semibold">Unit</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((product) => {
                    // When the list is filtered to a single shop, show that
                    // plant's stock + min-stock; otherwise show the total
                    // across all assignments and a count of plants.
                    const filteredPlant = listShopId
                      ? product.plants.find((p) => p.shopId === listShopId)
                      : undefined;
                    const stockValue =
                      listShopId && filteredPlant
                        ? (product.stockByShop?.[listShopId] ?? 0)
                        : (product.totalStock ?? product.currentStock ?? 0);
                    const minStockValue =
                      filteredPlant?.minStockLevel ??
                      (product.plants.length > 0
                        ? Math.min(
                            ...product.plants.map((p) => Number(p.minStockLevel ?? 0)),
                          )
                        : 0);
                    const isLowStock =
                      stockValue !== undefined && stockValue < minStockValue && minStockValue > 0;

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
                            <span className="tabular-nums">{stockValue}</span>
                            {isLowStock && (
                              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                <AlertTriangle className="h-3 w-3 mr-0.5" />
                                Low
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {listShopId && filteredPlant ? (
                            <span className="text-xs text-slate-600">
                              Min: {filteredPlant.minStockLevel}
                              {filteredPlant.maxStockLevel != null && (
                                <> · Max: {filteredPlant.maxStockLevel}</>
                              )}
                            </span>
                          ) : (
                            <Badge variant="secondary" className="font-normal">
                              {product.plants.length} plant{product.plants.length === 1 ? '' : 's'}
                            </Badge>
                          )}
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
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
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
                  <span className="px-2 text-sm text-slate-500">
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
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-l-0 sm:w-full sm:max-w-3xl"
        >
          <SheetHeader>
            <SheetTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</SheetTitle>
            <SheetDescription>
              {editingProduct
                ? `Update details for ${editingProduct.productCode}`
                : 'Fill in the details below to create a new product'}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-6">
            {/* 1. Product Information */}
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Product Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="description">Product Name *</Label>
                  <Input
                    id="description"
                    {...form.register('description')}
                    placeholder="e.g. Stainless Steel Bolt M8"
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
                <div className="space-y-2">
                  <Label htmlFor="productCode">SKU *</Label>
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
                    <p className="text-xs text-muted-foreground">
                      Auto prefix + numeric suffix (example: {currentPrefix}001)
                    </p>
                  )}
                  {form.formState.errors.productCode && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.productCode.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="materialGroup">Material Group</Label>
                  <Input
                    id="materialGroup"
                    {...form.register('materialGroup')}
                    placeholder="e.g. Stainless Steel"
                  />
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
                            <SelectItem key={u.value} value={u.value}>
                              {u.label}
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
            </section>

            {/* 2. Pricing */}
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Pricing</h3>
              <div className="grid gap-4 sm:grid-cols-2">
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
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Cost Price *</Label>
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
              </div>
            </section>

            {/* 3. Technical Details */}
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Technical Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="drawingReference">Drawing Reference</Label>
                  <Input
                    id="drawingReference"
                    {...form.register('drawingReference')}
                    placeholder="e.g. DRW-2024-001"
                  />
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
              </div>
            </section>

            {/* 4. Plant & Storage Location Assignment */}
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Plant & Storage Location Assignment
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={allPlantsAssigned}
                  onClick={() => plantsArray.append(emptyPlant)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Plant
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Select the plant this product belongs to (required). The product only
                shows on the Products list for shops it is assigned to. Add storage
                location and thresholds. Toggle{' '}
                <span className="font-medium text-slate-700">Active</span> to
                deactivate an assignment (kept in history but blocked from new
                transactions). Use the trash icon to delete it permanently —
                assignments with prior transactions are deactivated automatically.
              </p>
              <div className="space-y-3">
                {plantsArray.fields.map((field, index) => (
                  <PlantAssignmentRow
                    key={field.id}
                    control={form.control}
                    index={index}
                    shopOptions={shopList}
                    takenShopIds={takenShopIds}
                    onRemove={() => requestPlantRemoval(index)}
                    removable={plantsArray.fields.length > 1}
                    errors={form.formState.errors.plants?.[index] as never}
                  />
                ))}
              </div>
              {form.formState.errors.plants &&
                typeof form.formState.errors.plants.message === 'string' && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.plants.message}
                  </p>
                )}
              {shopList.length > 0 && plantsArray.fields.length === 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSheetOpen(false);
                    navigate('/storage-locations');
                  }}
                >
                  Manage Storage Locations
                </Button>
              )}
            </section>

            {/* 5. Specifications */}
            <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Specifications</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => specsArray.append({ label: '', value: '' })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Spec
                </Button>
              </div>
              {specsArray.fields.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Optional. Use this to capture {`{label, value}`} attributes (e.g. Material, Finish).
                </p>
              ) : (
                <div className="space-y-2">
                  {specsArray.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-[1fr_2fr_auto]"
                    >
                      <Input
                        placeholder="Label (e.g. Material)"
                        {...form.register(`specifications.${index}.label`)}
                      />
                      <Input
                        placeholder="Value (e.g. Stainless Steel)"
                        {...form.register(`specifications.${index}.value`)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => specsArray.remove(index)}
                        aria-label="Remove spec"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

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

      {/* Plant assignment removal confirmation */}
      <AlertDialog
        open={!!pendingPlantRemoval}
        onOpenChange={(open) => !open && setPendingPlantRemoval(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete plant assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Remove{' '}
              <span className="font-medium text-foreground">
                {pendingPlantShopName}
              </span>{' '}
              from this product? Plants without prior transaction history are
              deleted permanently. Plants with history are deactivated instead
              (preserved in stock ledgers and reports). To merely pause a plant
              without losing its setup, use the{' '}
              <span className="font-medium text-foreground">Active</span> toggle
              on the row.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
              onClick={confirmPlantRemoval}
            >
              Delete
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
