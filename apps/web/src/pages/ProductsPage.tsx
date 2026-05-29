import { useState, useEffect, useRef, useMemo, useCallback, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller, useFieldArray, useWatch, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Package,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  Upload,
  Eye,
  CheckCircle2,
  Shapes,
  ShoppingCart,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { downloadProductImportTemplate } from '@/lib/product-import-template';
import {
  buildProductCategoryEntry,
  useProductCategories,
} from '@/hooks/use-product-categories';
import { useGstHsnSearch } from '@/hooks/use-gst-hsn-search';
import { resolveHsnSuggestion, type HsnSuggestion } from '@/lib/hsn-suggest';
import { resolveStorageLocationIdForImport } from '@/lib/resolve-storage-location';
import { useAuthStore } from '@/store/authStore';
import {
  useProducts,
  useProductDeletionImpact,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useBulkProductImport,
  type BulkProductImportResult,
  type BulkProductImportRow,
  type CreateProductPayload,
  type Product,
  type ProductFilters,
  TAX_PREFERENCE_OPTIONS,
  formatTaxPreference,
} from '@/hooks/use-products';
import { useShops } from '@/hooks/use-shops';
import { useStorageLocations } from '@/hooks/use-storage-locations';
import { getApiErrorMessage } from '@/lib/api-error';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppLayout } from '@/components/AppLayout';
import { CreatePageLayout, PageHeader, SearchInput, LoadingSkeleton, EmptyState, AnimatedTableBody } from '@/components/shared';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useSuccessPulse } from '@/hooks/use-success-pulse';
import { showActionSuccess } from '@/lib/action-feedback';
import { Card, CardContent } from '@/components/ui/card';
import { downloadCsv, toCsv, type CsvColumn } from '@/lib/csv';

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

const PRODUCT_IMPORT_FIELD_ALIASES = {
  shop: ['Shop', 'Plant', 'Plant Number', 'Plant Name'],
  storageLocation: ['Storage Location Code', 'Storage Location', 'Location Code', 'Location Name'],
  productCode: ['Product Code', 'SKU', 'Product SKU', 'Item Code', 'Code'],
  description: ['Description', 'Product Name', 'Name', 'Item Name'],
  category: ['Category'],
  hsnCode: ['HSN Code', 'HSN'],
  materialGroup: ['Material Group'],
  drawingReference: ['Drawing Reference', 'Drawing Ref', 'Drawing'],
  brand: ['Brand'],
  taxPreference: ['Tax Preference', 'Tax Status'],
  purchasePrice: ['Purchase Price', 'Cost Price'],
  sellingPrice: ['Selling Price', 'Sale Price'],
  openingStock: ['Opening Stock', 'Stock', 'Opening Qty', 'Opening Quantity'],
  minStockLevel: ['Min Stock Level', 'Min Stock', 'Minimum Stock'],
  maxStockLevel: ['Max Stock Level', 'Max Stock', 'Maximum Stock'],
  reorderQty: ['Reorder Qty', 'Reorder Quantity', 'Reorder Level'],
  uom: ['Unit of Measure', 'Unit', 'UOM'],
  isActive: ['Active Status', 'Status', 'Is Active', 'Active'],
} as const;

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
const PAGE_SIZE = 25;
const CREATE_CATEGORY_OPTION = '__create_category__';
/** API rejects limit > 100 (ListProductsDto @Max(100)). */
const STATS_FETCH_LIMIT = 100;

function normalizeProductCode(value: string): string {
  return value.trim().toUpperCase();
}

function parseProductCodeSequence(productCode: string, prefix: string): number | null {
  const normalizedCode = normalizeProductCode(productCode);
  const normalizedPrefix = normalizeProductCode(prefix);
  if (!normalizedCode.startsWith(normalizedPrefix)) return null;
  const suffix = normalizedCode.slice(normalizedPrefix.length);
  if (!/^\d+$/.test(suffix)) return null;
  return Number(suffix);
}

function nextProductCodeForPrefix(prefix: string, existingCodes: Iterable<string>): string {
  const normalizedPrefix = normalizeProductCode(prefix || 'PRD');
  const known = new Set(Array.from(existingCodes, (code) => normalizeProductCode(code)).filter(Boolean));
  let maxSequence = 0;
  for (const code of known) {
    const sequence = parseProductCodeSequence(code, normalizedPrefix);
    if (sequence != null) {
      maxSequence = Math.max(maxSequence, sequence);
    }
  }

  let candidate = maxSequence + 1;
  while (candidate < Number.MAX_SAFE_INTEGER) {
    const nextCode = `${normalizedPrefix}${String(candidate).padStart(Math.max(3, String(candidate).length), '0')}`;
    if (!known.has(nextCode)) {
      return nextCode;
    }
    candidate += 1;
  }

  return `${normalizedPrefix}${Date.now().toString().slice(-6)}`;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function resolveProductStock(product: Product, shopId?: string): number {
  if (shopId) {
    return product.stockByShop?.[shopId] ?? 0;
  }
  return product.totalStock ?? product.currentStock ?? 0;
}

function resolveMinStock(product: Product, shopId?: string): number {
  if (shopId) {
    const plant = product.plants.find((p) => p.shopId === shopId);
    return plant?.minStockLevel ?? 0;
  }
  if (product.plants.length === 0) return 0;
  return Math.min(...product.plants.map((p) => Number(p.minStockLevel ?? 0)));
}

function isLowStock(stock: number, min: number): boolean {
  return min > 0 && stock > 0 && stock < min;
}

function isOutOfStock(stock: number): boolean {
  return stock <= 0;
}

type KpiCardProps = {
  label: string;
  value: number;
  accent: string;
  icon: React.ReactNode;
};

function KpiCard({ label, value, accent, icon }: KpiCardProps) {
  return (
    <Card className="overflow-hidden border-border bg-card shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('w-1 self-stretch rounded-full', accent)} aria-hidden />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StockCell({ stock, min }: { stock: number; min: number }) {
  if (isOutOfStock(stock)) {
    return (
      <span className="inline-flex min-w-[2.25rem] justify-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-sm font-medium tabular-nums text-red-700">
        {stock}
      </span>
    );
  }
  if (isLowStock(stock, min)) {
    return (
      <span className="inline-flex min-w-[2.25rem] justify-center rounded-md bg-orange-100 px-2 py-0.5 text-sm font-medium tabular-nums text-orange-800">
        {stock}
      </span>
    );
  }
  return <span className="text-sm tabular-nums text-slate-700">{stock}</span>;
}

function ProductStatusPill({ active }: { active: boolean }) {
  if (!active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Inactive
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  );
}

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
  hsnCode: z
    .string()
    .optional()
    .refine((v) => !v?.trim() || /^\d{4}(\d{2}){0,2}$/.test(v.trim()), {
      message: 'HSN code must be 4, 6, or 8 digits',
    }),
  materialGroup: z.string().optional(),
  drawingReference: z.string().optional(),
  brand: z.string().optional(),
  taxPreference: z.enum(['TAXABLE', 'NON_TAXABLE']),
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
  hsnCode: '',
  materialGroup: '',
  drawingReference: '',
  brand: '',
  taxPreference: 'TAXABLE',
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

export function ProductsPage({ createOnly = false }: { createOnly?: boolean }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminUser(user);
  const shops = useShops();
  const shopList = shops.data ?? [];
  const defaultShopId = isShopOnlyUser(user) ? user!.shopId! : '';
  const { data: importStorageLocations = [] } = useStorageLocations(
    isShopOnlyUser(user) ? user!.shopId! : undefined,
  );
  const [listShopFilter, setListShopFilter] = useState<string>('all');
  const listShopId = productListShopId(user, listShopFilter);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
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
  const [importDryRun, setImportDryRun] = useState(false);
  const [lastImportReport, setLastImportReport] = useState<BulkProductImportResult | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const { pulseClass, triggerPulse } = useSuccessPulse();

  const filters: ProductFilters = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    shopId: listShopId,
  };

  const { data, isLoading, isError } = useProducts(filters);
  const isSearchPending = search !== debouncedSearch || (isLoading && search.trim().length > 0);
  const statsQuery = useProducts({
    page: 1,
    limit: STATS_FETCH_LIMIT,
    shopId: listShopId,
  });
  const { categories: categoryConfig, addCategory } = useProductCategories();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [quickCategory, setQuickCategory] = useState({ name: '', description: '', defaultHsnCode: '' });
  const [hsnSuggestion, setHsnSuggestion] = useState<HsnSuggestion | null>(null);
  const [hsnLookupDebounced, setHsnLookupDebounced] = useState('');
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const bulkProductImport = useBulkProductImport();
  const deleteImpactQuery = useProductDeletionImpact(deleteTarget?.id);

  const items: Product[] = data?.items ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };
  const catalogTotal = meta.total;

  const stats = useMemo(() => {
    const statsRows = statsQuery.data?.items ?? [];
    const rows = statsRows.length > 0 ? statsRows : items;
    const total = statsQuery.data?.meta.total ?? meta.total ?? rows.length;

    let active = 0;
    let lowStock = 0;
    let outOfStock = 0;
    for (const product of rows) {
      if (!product.isActive) continue;
      active += 1;
      const stock = resolveProductStock(product, listShopId);
      const min = resolveMinStock(product, listShopId);
      if (isOutOfStock(stock)) outOfStock += 1;
      else if (isLowStock(stock, min)) lowStock += 1;
    }

    return { total, active, lowStock, outOfStock };
  }, [statsQuery.data, items, meta.total, listShopId]);

  const knownProductCodes = useMemo(
    () =>
      new Set(
        (statsQuery.data?.items ?? items)
          .map((product) => normalizeProductCode(product.productCode))
          .filter(Boolean),
      ),
    [items, statsQuery.data],
  );

  const nextAvailableProductCode = useCallback(
    (prefix: string, reservedCodes: Iterable<string> = []) =>
      nextProductCodeForPrefix(prefix, [...knownProductCodes, ...reservedCodes]),
    [knownProductCodes],
  );

  const isDuplicateProductCodeError = useCallback((error: unknown) => {
    const message =
      (
        error as {
          response?: { data?: { error?: { message?: string } } };
          message?: string;
        }
      ).response?.data?.error?.message ??
      (error as Error).message ??
      '';
    return /product code/i.test(message) && /(exist|unique|duplicate)/i.test(message)
      || (/unique constraint failed/i.test(message) && /product[_\s]?code/i.test(message));
  }, []);

  const createProductWithResolvedCode = useCallback(
    async (
      payload: Omit<CreateProductPayload, 'productCode'> & { productCode?: string },
      categoryName: string,
      reservedCodes: Set<string>,
    ) => {
      const prefix =
        categoryConfig.find((category) => category.name === categoryName)?.skuPrefix ?? 'PRD';
      let candidateCode =
        payload.productCode?.trim()
          ? normalizeProductCode(payload.productCode)
          : nextAvailableProductCode(prefix, reservedCodes);
      const usingAutoCode = !payload.productCode?.trim();

      for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
          const created = await createProduct.mutateAsync({
            ...payload,
            productCode: candidateCode,
          });
          reservedCodes.add(candidateCode);
          return created;
        } catch (error) {
          if (!usingAutoCode || !isDuplicateProductCodeError(error) || attempt === 9) {
            throw error;
          }
          reservedCodes.add(candidateCode);
          candidateCode = nextAvailableProductCode(prefix, reservedCodes);
        }
      }

      throw new Error('Could not generate a unique SKU');
    },
    [categoryConfig, createProduct, isDuplicateProductCodeError, nextAvailableProductCode],
  );

  function onExportCsv() {
    const columns: CsvColumn<Product>[] = [
      { header: 'SKU', value: (r) => r.productCode },
      { header: 'Name', value: (r) => r.description },
      { header: 'Category', value: (r) => r.category },
      { header: 'Brand', value: (r) => r.brand ?? '' },
      { header: 'Tax Preference', value: (r) => formatTaxPreference(r.taxPreference) },
      { header: 'Unit', value: (r) => r.uom },
      { header: 'Selling Price', value: (r) => r.sellingPrice },
      { header: 'Cost Price', value: (r) => r.purchasePrice },
      {
        header: 'Stock',
        value: (r) => resolveProductStock(r, listShopId),
      },
      { header: 'Status', value: (r) => (r.isActive ? 'Active' : 'Inactive') },
    ];
    downloadCsv('products.csv', toCsv(items, columns));
    toast.success('CSV exported');
  }

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
  const watchedDescription = form.watch('description');
  const watchedHsnCode = form.watch('hsnCode');
  const selectedCategoryConfig = categoryConfig.find((c) => c.name === selectedCategory);
  const currentPrefix = selectedCategoryConfig?.skuPrefix ?? 'PRD';

  const hsnLookupRaw = useMemo(() => {
    const hsn = (watchedHsnCode ?? '').trim();
    const desc = (watchedDescription ?? '').trim();
    if (/^\d{3,}$/.test(hsn)) return hsn;
    if (desc.length >= 3) return desc;
    return '';
  }, [watchedHsnCode, watchedDescription]);

  useEffect(() => {
    const timer = window.setTimeout(() => setHsnLookupDebounced(hsnLookupRaw), 400);
    return () => window.clearTimeout(timer);
  }, [hsnLookupRaw]);

  const gstHsnQuery = useGstHsnSearch(hsnLookupDebounced, sheetOpen || createOnly);

  const refreshHsnSuggestion = useCallback(() => {
    const gstTop = gstHsnQuery.data?.[0];
    if (gstTop) {
      setHsnSuggestion({
        code: gstTop.code,
        description: gstTop.description,
        source: 'gst',
        confidence: 'high',
      });
      return;
    }
    const suggestion = resolveHsnSuggestion({
      description: watchedDescription ?? '',
      categoryName: selectedCategory,
      categoryDefaultHsn: selectedCategoryConfig?.defaultHsnCode,
    });
    setHsnSuggestion(suggestion);
  }, [
    gstHsnQuery.data,
    selectedCategory,
    selectedCategoryConfig?.defaultHsnCode,
    watchedDescription,
  ]);

  useEffect(() => {
    refreshHsnSuggestion();
  }, [refreshHsnSuggestion]);

  const applyHsnSuggestion = () => {
    if (!hsnSuggestion) return;
    form.setValue('hsnCode', hsnSuggestion.code, { shouldValidate: true, shouldDirty: true });
  };

  const applyHsnCode = (code: string) => {
    form.setValue('hsnCode', code, { shouldValidate: true, shouldDirty: true });
  };

  const hsnSuggestionSourceLabel = (source: HsnSuggestion['source']) => {
    if (source === 'gst') return 'from GST portal';
    if (source === 'category') return 'from category';
    return 'from product name';
  };

  const composedProductCode = `${currentPrefix}${skuNumber}`;

  useEffect(() => {
    if (!editingProduct) {
      form.setValue('productCode', composedProductCode, { shouldValidate: true });
    }
  }, [composedProductCode, editingProduct, form]);

  function handleQuickCategoryCreate() {
    const name = quickCategory.name.trim();
    if (!name) {
      toast.error('Category name is required');
      return;
    }
    if (categoryConfig.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error('A category with this name already exists');
      return;
    }
    const entry = buildProductCategoryEntry(
      name,
      categoryConfig,
      quickCategory.description,
      quickCategory.defaultHsnCode,
    );
    addCategory(entry);
    form.setValue('category', entry.name, { shouldValidate: true, shouldDirty: true });
    setQuickCategory({ name: '', description: '', defaultHsnCode: '' });
    setHsnSuggestion(
      entry.defaultHsnCode
        ? {
            code: entry.defaultHsnCode,
            description: `${entry.name} (category default)`,
            source: 'category',
            confidence: 'high',
          }
        : null,
    );
    setCategoryDialogOpen(false);
    toast.success(`Category "${entry.name}" created`);
  }

  const resetCreateForm = () => {
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
  };

  const openCreate = () => {
    if (createOnly) {
      resetCreateForm();
      return;
    }
    navigate('/products/new');
  };

  useEffect(() => {
    if (createOnly) {
      resetCreateForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset once on create page mount
  }, [createOnly]);

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      productCode: product.productCode,
      description: product.description,
      category: product.category,
      hsnCode: product.hsnCode ?? '',
      materialGroup: product.materialGroup ?? '',
      drawingReference: product.drawingReference ?? '',
      brand: product.brand ?? '',
      taxPreference: product.taxPreference ?? 'TAXABLE',
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
      const enteredSkuNumber = skuNumber.trim();
      const finalProductCode = editingProduct
        ? rawValues.productCode
        : enteredSkuNumber
          ? composedProductCode
          : nextAvailableProductCode(currentPrefix);
      if (!rawValues.plants.some((p) => p.shopId?.trim())) {
        toast.error('Select a plant — products only appear for shops they are assigned to');
        return;
      }
      const values: ProductFormValues = {
        productCode: finalProductCode,
        description: rawValues.description,
        category: rawValues.category,
        hsnCode: rawValues.hsnCode,
        materialGroup: rawValues.materialGroup,
        drawingReference: rawValues.drawingReference,
        brand: rawValues.brand,
        taxPreference: rawValues.taxPreference,
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
        setSheetOpen(false);
      } else {
        const payload = mapProductFormToPayload({
          values,
          finalProductCode,
          mode: 'create',
        });
        const created = await createProductWithResolvedCode(
          {
            ...payload,
            productCode: enteredSkuNumber ? finalProductCode : undefined,
          },
          rawValues.category,
          new Set<string>(),
        );
        const plantName =
          shopList.find((s) => s.id === created.plants[0]?.shopId)?.shopName ?? 'selected plant';
        triggerPulse();
        showActionSuccess({
          message: `Product ${created.productCode} created for ${plantName}. It appears in the list below.`,
        });
        setPage(1);
        setSearch('');
        setCategoryFilter('all');
        setStatusFilter('all');
        if (!isShopOnlyUser(user)) {
          setListShopFilter('all');
        }
        if (createOnly) {
          navigate('/products');
        } else {
          setSheetOpen(false);
        }
      }
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
      toast.error(getApiErrorMessage(err, 'Failed to delete product'));
    }
  };

  const handleDeactivateInstead = async () => {
    if (!deleteTarget) return;
    try {
      await updateProduct.mutateAsync({ id: deleteTarget.id, isActive: false });
      toast.success(`${deleteTarget.description} deactivated`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to deactivate product'));
    }
  };

  const isMutating = createProduct.isPending || updateProduct.isPending;

  const downloadProductTemplate = () => {
    const fixedShop = user?.shopId
      ? shopList.find((s) => s.id === user.shopId)?.shopNumber
      : undefined;
    const sampleShopNumber = fixedShop ?? shopList[0]?.shopNumber ?? '';
    const sampleShopId =
      user?.shopId ?? shopList.find((s) => s.shopNumber === sampleShopNumber)?.id ?? shopList[0]?.id;
    const sampleLocation = importStorageLocations.find(
      (loc) => loc.isActive && (!sampleShopId || loc.shopId === sampleShopId),
    );
    downloadProductImportTemplate({
      fixedShopNumber: fixedShop,
      sampleShopNumber,
      sampleStorageLocationCode: sampleLocation?.code ?? '',
      categories: categoryConfig.map((c) => c.name),
      shopNumbers: shopList.map((s) => `${s.shopNumber} — ${s.shopName}`),
      storageLocations: importStorageLocations.map((loc) => {
        const shop = shopList.find((s) => s.id === loc.shopId);
        return {
          shopNumber: shop?.shopNumber ?? '',
          shopName: shop?.shopName ?? '',
          code: loc.code,
          name: loc.name,
          isActive: loc.isActive,
        };
      }),
    });
    toast.success('Template downloaded — fill the Products sheet (see Storage Locations sheet for codes)');
  };

  const parseBoolean = (value: unknown, fallback = true) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return fallback;
    return ['true', 'yes', '1', 'active'].includes(normalized);
  };

  const normalizeImportKey = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');

  const getByNormalizedKey = (row: Record<string, unknown>, key: string) => {
    const target = normalizeImportKey(key);
    const entry = Object.entries(row).find(
      ([k]) => normalizeImportKey(k) === target,
    );
    return entry?.[1];
  };

  const getImportValue = (
    row: Record<string, unknown>,
    aliases: readonly string[],
  ) => {
    for (const alias of aliases) {
      const value = getByNormalizedKey(row, alias);
      if (value !== undefined) return value;
    }
    return undefined;
  };

  const parseImportNumber = (value: unknown, fallback = 0) => {
    if (value === '' || value === undefined || value === null) return fallback;
    if (typeof value === 'number') return value;
    const normalized = String(value)
      .trim()
      .replace(/,/g, '')
      .replace(/[^\d.-]/g, '');
    if (!normalized) return fallback;
    return Number(normalized);
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const productsSheetName =
        workbook.SheetNames.find((name) => name.trim().toLowerCase() === 'products') ??
        workbook.SheetNames[0];
      if (!productsSheetName) {
        toast.error('No worksheet found in the uploaded file');
        return;
      }

      const worksheet = workbook.Sheets[productsSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
      if (rows.length === 0) {
        toast.error('Excel file is empty');
        return;
      }

      const payloadRows: BulkProductImportRow[] = rows.map((row, index) => {
        const rowNumber = index + 2;
        const code = String(getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.productCode) ?? '').trim();
        const description = String(
          getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.description) ?? '',
        ).trim();
        const category = String(getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.category) ?? '').trim();
        const uom =
          String(getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.uom) ?? 'pcs').trim() || 'pcs';
        const purchasePrice = parseImportNumber(
          getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.purchasePrice),
          Number.NaN,
        );
        const sellingPrice = parseImportNumber(
          getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.sellingPrice),
          Number.NaN,
        );
        const openingStock = parseImportNumber(
          getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.openingStock),
          Number.NaN,
        );
        const minStockLevel = parseImportNumber(
          getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.minStockLevel),
          Number.NaN,
        );
        const reorderQtyRaw = getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.reorderQty);
        const reorderQty =
          reorderQtyRaw === '' || reorderQtyRaw === undefined || reorderQtyRaw === null
            ? undefined
            : parseImportNumber(reorderQtyRaw, Number.NaN);
        const maxStockRaw = getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.maxStockLevel);
        const maxStockLevel =
          maxStockRaw === '' || maxStockRaw === undefined || maxStockRaw === null
            ? undefined
            : parseImportNumber(maxStockRaw, Number.NaN);
        const hsnCode = String(getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.hsnCode) ?? '').trim();
        const materialGroup = String(
          getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.materialGroup) ?? '',
        ).trim();
        const drawingReference = String(
          getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.drawingReference) ?? '',
        ).trim();
        const brand = String(getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.brand) ?? '').trim();
        const taxPreferenceRaw = String(
          getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.taxPreference) ?? '',
        )
          .trim()
          .toLowerCase();
        const taxPreference =
          taxPreferenceRaw === 'non-taxable' ||
          taxPreferenceRaw === 'non taxable' ||
          taxPreferenceRaw === 'nontaxable' ||
          taxPreferenceRaw === 'non_taxable'
            ? ('NON_TAXABLE' as const)
            : ('TAXABLE' as const);
        const isActive = parseBoolean(
          getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.isActive),
          true,
        );
        const shopValue = String(getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.shop) ?? '').trim();
        const storageLocationCode = String(
          getImportValue(row, PRODUCT_IMPORT_FIELD_ALIASES.storageLocation) ?? '',
        ).trim();

        if (!description) throw new Error(`Row ${rowNumber}: Description is required`);
        if (!category) throw new Error(`Row ${rowNumber}: Category is required`);
        if (hsnCode && !/^\d{4}(\d{2}){0,2}$/.test(hsnCode)) {
          throw new Error(`Row ${rowNumber}: HSN code must be 4, 6, or 8 digits`);
        }
        if (!uom) throw new Error(`Row ${rowNumber}: Unit of Measure is required`);
        if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
          throw new Error(`Row ${rowNumber}: Invalid Purchase Price`);
        }
        if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
          throw new Error(`Row ${rowNumber}: Invalid Selling Price`);
        }
        if (!Number.isFinite(openingStock) || openingStock < 0) {
          throw new Error(`Row ${rowNumber}: Invalid Opening Stock`);
        }
        if (!Number.isFinite(minStockLevel) || minStockLevel < 0) {
          throw new Error(`Row ${rowNumber}: Invalid Min Stock Level`);
        }
        if (
          reorderQty !== undefined &&
          (!Number.isFinite(reorderQty) || reorderQty < 0)
        ) {
          throw new Error(`Row ${rowNumber}: Invalid Reorder Qty`);
        }
        if (
          maxStockLevel !== undefined &&
          (!Number.isFinite(maxStockLevel) || maxStockLevel < 0)
        ) {
          throw new Error(`Row ${rowNumber}: Invalid Max Stock Level`);
        }

        return {
          productCode: code ? normalizeProductCode(code) : undefined,
          shopNumber: shopValue || undefined,
          storageLocationCode: storageLocationCode || undefined,
          description,
          category,
          hsnCode: hsnCode || undefined,
          materialGroup: materialGroup || undefined,
          drawingReference: drawingReference || undefined,
          brand: brand || undefined,
          taxPreference,
          purchasePrice,
          sellingPrice,
          openingStock,
          minStockLevel,
          maxStockLevel,
          reorderQty,
          uom,
          isActive,
        };
      });

      const result = await bulkProductImport.mutateAsync({
        rows: payloadRows,
        validateOnly: importDryRun,
      });
      setLastImportReport(result);

      if (result.failed > 0) {
        toast.error(
          `${result.failed} row(s) failed. ${result.validateOnly ? result.validated : result.created + result.updated} row(s) processed successfully.`,
        );
      } else {
        toast.success(
          result.validateOnly
            ? `${result.validated} row(s) validated successfully`
            : `${result.created} created and ${result.updated} updated successfully`,
        );
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to process Excel file'));
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const openImportPicker = (dryRun: boolean) => {
    setImportDryRun(dryRun);
    importInputRef.current?.click();
  };

  const downloadImportResults = () => {
    if (!lastImportReport) return;
    const columns: CsvColumn<BulkProductImportResult['results'][number]>[] = [
      { header: 'Row', value: (row) => row.row },
      { header: 'Status', value: (row) => row.status },
      { header: 'Action', value: (row) => row.action },
      { header: 'Product Code', value: (row) => row.productCode },
      { header: 'Plant', value: (row) => row.shopNumber },
      { header: 'Message', value: (row) => row.message },
      { header: 'Warnings', value: (row) => row.warnings.join(' | ') },
    ];
    downloadCsv('product-import-results.csv', toCsv(lastImportReport.results, columns));
    toast.success('Import results exported');
  };

  function renderProductForm(onCancel: () => void) {
    return (
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
            <Select
              value={field.value}
              onValueChange={(v) => {
                if (v === CREATE_CATEGORY_OPTION) {
                  setCategoryDialogOpen(true);
                  return;
                }
                field.onChange(v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value={CREATE_CATEGORY_OPTION}
                  className="font-medium text-indigo-700"
                >
                  + Create new category
                </SelectItem>
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
        <Label htmlFor="productCode">SKU</Label>
        {editingProduct ? (
          <Input id="productCode" {...form.register('productCode')} disabled />
        ) : (
          <div className="grid grid-cols-[110px_1fr] gap-2">
            <Input value={currentPrefix} disabled />
            <Input
              id="productCode"
              inputMode="numeric"
              placeholder="Leave blank to auto-generate"
              value={skuNumber}
              onChange={(e) => setSkuNumber(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        )}
        {!editingProduct && (
          <p className="text-xs text-muted-foreground">
            Prefix comes from category. Enter digits or leave the number blank to auto-generate the next SKU.
          </p>
        )}
        {form.formState.errors.productCode && (
          <p className="text-xs text-destructive">
            {form.formState.errors.productCode.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="hsnCode">HSN Code</Label>
        <Input
          id="hsnCode"
          inputMode="numeric"
          maxLength={8}
          {...form.register('hsnCode')}
          placeholder="e.g. 84314900"
        />
        {form.formState.errors.hsnCode && (
          <p className="text-xs text-destructive">
            {form.formState.errors.hsnCode.message}
          </p>
        )}
        {gstHsnQuery.isFetching && hsnLookupDebounced.length >= 3 ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Searching GST portal…
          </p>
        ) : null}
        {gstHsnQuery.isError && hsnLookupDebounced.length >= 3 ? (
          <p className="text-xs text-amber-700">
            GST portal search unavailable — using local suggestions or enter HSN manually.
          </p>
        ) : null}
        {(gstHsnQuery.data?.length ?? 0) > 0 ? (
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-slate-600">
              GST portal ({gstHsnQuery.data!.length} result
              {gstHsnQuery.data!.length === 1 ? '' : 's'})
            </p>
          <ul className="max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white text-xs shadow-sm">
            {gstHsnQuery.data!.map((row) => (
              <li key={row.code} className="border-b border-slate-100 last:border-0">
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-2.5 py-2 text-left hover:bg-indigo-50 sm:flex-row sm:items-center sm:gap-2"
                  onClick={() => applyHsnCode(row.code)}
                >
                  <span className="font-mono font-semibold text-indigo-900">{row.code}</span>
                  <span className="text-slate-600">{row.description}</span>
                </button>
              </li>
            ))}
          </ul>
          </div>
        ) : null}
        {hsnSuggestion && watchedHsnCode?.trim() !== hsnSuggestion.code ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-xs text-indigo-900">
            <span>
              Suggested:{' '}
              <span className="font-mono font-semibold">{hsnSuggestion.code}</span>
              <span className="text-indigo-700"> — {hsnSuggestion.description}</span>
              <span className="ml-1 text-indigo-600">
                ({hsnSuggestionSourceLabel(hsnSuggestion.source)})
              </span>
            </span>
            <Button type="button" variant="outline" size="sm" className="h-7" onClick={applyHsnSuggestion}>
              Use this HSN
            </Button>
          </div>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          GST portal results are indicative — verify on the{' '}
          <a
            href="https://services.gst.gov.in/services/searchhsn"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 underline"
          >
            GST HSN search
          </a>{' '}
          before invoicing.
        </p>
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
        <Label htmlFor="brand">Brand</Label>
        <Input
          id="brand"
          {...form.register('brand')}
          placeholder="e.g. Bosch"
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
      <div className="space-y-2">
        <Label htmlFor="taxPreference">Tax Preference *</Label>
        <Controller
          control={form.control}
          name="taxPreference"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="taxPreference">
                <SelectValue placeholder="Select tax preference" />
              </SelectTrigger>
              <SelectContent>
                {TAX_PREFERENCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.taxPreference && (
          <p className="text-xs text-destructive">
            {form.formState.errors.taxPreference.message}
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
          if (!createOnly) setSheetOpen(false);
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
      onClick={onCancel}
    >
      Cancel
    </Button>
    <Button type="submit" className="flex-1" disabled={isMutating}>
      {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
      {editingProduct ? 'Update Product' : 'Create Product'}
    </Button>
  </div>
</form>
    );
  }

  function renderFormDialogs() {
    return (
      <>
        <Dialog
          open={categoryDialogOpen}
          onOpenChange={(open) => {
            setCategoryDialogOpen(open);
            if (!open) setQuickCategory({ name: '', description: '', defaultHsnCode: '' });
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
              <DialogDescription>
                Add a category and use it on this product. SKU prefix is assigned automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Category Name *</Label>
                <Input
                  className="h-9"
                  value={quickCategory.name}
                  onChange={(e) => setQuickCategory((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Fasteners"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description (optional)</Label>
                <Input
                  className="h-9"
                  value={quickCategory.description}
                  onChange={(e) =>
                    setQuickCategory((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Short note for this category"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Default HSN Code (optional)</Label>
                <Input
                  className="h-9 font-mono"
                  inputMode="numeric"
                  maxLength={8}
                  value={quickCategory.defaultHsnCode}
                  onChange={(e) =>
                    setQuickCategory((p) => ({
                      ...p,
                      defaultHsnCode: e.target.value.replace(/\D/g, ''),
                    }))
                  }
                  placeholder="e.g. 84072900"
                />
                <p className="text-[11px] text-muted-foreground">
                  New products in this category can use this HSN automatically.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleQuickCategoryCreate}>
                Create & Select
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
      </>
    );
  }

  if (createOnly) {
    return (
      <AppLayout active="Products">
        <CreatePageLayout
          title="Add Product"
          description="Fill in the details below to create a new product"
          backTo="/products"
        >
          {renderProductForm(() => navigate('/products'))}
        </CreatePageLayout>
        {renderFormDialogs()}
      </AppLayout>
    );
  }

  return (
    <AppLayout active="Products">
      <div className="space-y-6">
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImportFile}
        />

        <PageHeader
          title="Products"
          description={`${catalogTotal} product${catalogTotal === 1 ? '' : 's'} in catalog`}
        >
          <Button variant="outline" onClick={onExportCsv} disabled={items.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button type="button" variant="outline" onClick={downloadProductTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download template
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isImporting}
            onClick={() => openImportPicker(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting && importDryRun ? 'Validating…' : 'Validate file'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isImporting}
            onClick={() => openImportPicker(false)}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting && !importDryRun ? 'Uploading…' : 'Upload'}
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </PageHeader>

        {lastImportReport ? (
          <Card className="border-slate-200/90 shadow-sm">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900">
                    Last import {lastImportReport.validateOnly ? 'validation' : 'upload'} processed{' '}
                    {lastImportReport.total} row(s)
                  </p>
                  <p className="text-xs text-slate-600">
                    {lastImportReport.validateOnly
                      ? `${lastImportReport.validated} validated`
                      : `${lastImportReport.created} created, ${lastImportReport.updated} updated`}
                    {` · ${lastImportReport.failed} failed`}
                  </p>
                  {lastImportReport.failed > 0 ? (
                    <p className="text-xs text-amber-700">
                      First failure:{' '}
                      {
                        lastImportReport.results.find((result) => result.status === 'failed')?.message
                      }
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={downloadImportResults}>
                    Download results
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={downloadProductTemplate}>
                    Download template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Products"
            value={stats.total}
            accent="bg-indigo-500"
            icon={<Shapes className="h-5 w-5 text-indigo-600" />}
          />
          <KpiCard
            label="Active"
            value={stats.active}
            accent="bg-emerald-500"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          />
          <KpiCard
            label="Low Stock"
            value={stats.lowStock}
            accent="bg-orange-500"
            icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
          />
          <KpiCard
            label="Out of Stock"
            value={stats.outOfStock}
            accent="bg-red-500"
            icon={<ShoppingCart className="h-5 w-5 text-red-600" />}
          />
        </div>

        <Card className={cn('border-slate-200/90 shadow-sm', pulseClass)}>
          <CardContent className="space-y-4 p-4 pt-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <SearchInput
                placeholder="Search by name or SKU…"
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                isSearching={isSearchPending}
                showNoResults={
                  !isLoading &&
                  !isSearchPending &&
                  search.trim().length > 0 &&
                  items.length === 0 &&
                  !isError
                }
                noResultsMessage="No products match your search."
                className="max-w-md"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={categoryFilter}
                  onValueChange={(v) => {
                    setCategoryFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full sm:w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
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
                  <SelectTrigger className="h-9 w-full sm:w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
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
                    <SelectTrigger className="h-9 w-full sm:w-[180px]">
                      <SelectValue placeholder="Plant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All plants</SelectItem>
                      {shopList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.shopName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              {isLoading ? (
                <div className="p-4">
                  <LoadingSkeleton rows={8} cols={8} />
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertTriangle className="mb-3 h-10 w-10 text-destructive" />
                  <p className="text-sm font-medium text-destructive">Failed to load products</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title={
                    search || categoryFilter !== 'all' || statusFilter !== 'all'
                      ? 'No products match your filters'
                      : 'No products yet'
                  }
                  description={
                    search || categoryFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try adjusting your search or filters.'
                      : 'Get started by adding your first product to the catalog.'
                  }
                  action={
                    !search && categoryFilter === 'all' && statusFilter === 'all' ? (
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">SKU</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Name</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Category</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Unit</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                        Selling Price
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">
                        Cost Price
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">Stock</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <AnimatedTableBody pageKey={page}>
                    {items.map((product) => {
                      const stockValue = resolveProductStock(product, listShopId);
                      const minStockValue = resolveMinStock(product, listShopId);

                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => setViewingProduct(product)}
                              className="font-mono text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              {product.productCode}
                            </button>
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate font-medium text-slate-900">
                            {product.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal">
                              {product.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{product.uom}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-slate-700">
                            {formatAmount(product.sellingPrice)}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-slate-700">
                            {formatAmount(product.purchasePrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            <StockCell stock={stockValue} min={minStockValue} />
                          </TableCell>
                          <TableCell>
                            <ProductStatusPill active={product.isActive} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500"
                                aria-label="View product"
                                onClick={() => setViewingProduct(product)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500"
                                aria-label="Edit product"
                                onClick={() => openEdit(product)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                                aria-label="Delete product"
                                onClick={() => setDeleteTarget(product)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </AnimatedTableBody>
                </Table>
              )}
            </div>

            {!isLoading && !isError && items.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing{' '}
                  <span className="font-medium">{(meta.page - 1) * meta.limit + 1}</span>–
                  <span className="font-medium">{Math.min(meta.page * meta.limit, meta.total)}</span> of{' '}
                  <span className="font-medium">{meta.total}</span>
                </p>
                <div className="flex items-center gap-2">
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
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!viewingProduct} onOpenChange={(open) => !open && setViewingProduct(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{viewingProduct?.description}</SheetTitle>
            <SheetDescription className="font-mono text-indigo-600">
              {viewingProduct?.productCode}
            </SheetDescription>
          </SheetHeader>
          {viewingProduct && (
            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Category</dt>
                <dd className="mt-1 text-slate-900">{viewingProduct.category}</dd>
              </div>
              {viewingProduct.hsnCode ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">HSN Code</dt>
                  <dd className="mt-1 font-mono text-slate-900">{viewingProduct.hsnCode}</dd>
                </div>
              ) : null}
              {viewingProduct.brand ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Brand</dt>
                  <dd className="mt-1 text-slate-900">{viewingProduct.brand}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Tax preference</dt>
                <dd className="mt-1 text-slate-900">{formatTaxPreference(viewingProduct.taxPreference)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Unit</dt>
                <dd className="mt-1 text-slate-900">{viewingProduct.uom}</dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Selling price</dt>
                  <dd className="mt-1 tabular-nums text-slate-900">
                    {formatAmount(viewingProduct.sellingPrice)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Cost price</dt>
                  <dd className="mt-1 tabular-nums text-slate-900">
                    {formatAmount(viewingProduct.purchasePrice)}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Stock</dt>
                <dd className="mt-1">
                  <StockCell
                    stock={resolveProductStock(viewingProduct, listShopId)}
                    min={resolveMinStock(viewingProduct, listShopId)}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</dt>
                <dd className="mt-1">
                  <ProductStatusPill active={viewingProduct.isActive} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Plants</dt>
                <dd className="mt-2 space-y-2 text-slate-700">
                  {viewingProduct.plants.length === 0 ? (
                    <span>No plant assignment</span>
                  ) : (
                    viewingProduct.plants.map((plant) => {
                      const shop = shopList.find((row) => row.id === plant.shopId);
                      return (
                        <div
                          key={plant.id ?? plant.shopId}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <p className="font-medium text-slate-900">
                            {shop ? `${shop.shopName} (${shop.shopNumber})` : plant.shopId}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Storage Location:{' '}
                            {plant.storageLocation
                              ? `${plant.storageLocation.name} (${plant.storageLocation.code})`
                              : 'Not assigned'}
                          </p>
                        </div>
                      );
                    })
                  )}
                </dd>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const p = viewingProduct;
                    setViewingProduct(null);
                    openEdit(p);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                {!viewingProduct.isActive ? (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleToggleStatus(viewingProduct);
                      setViewingProduct({ ...viewingProduct, isActive: true });
                    }}
                  >
                    Activate
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setViewingProduct(null);
                      setDeactivateTarget(viewingProduct);
                    }}
                  >
                    Deactivate
                  </Button>
                )}
              </div>
            </dl>
          )}
        </SheetContent>
      </Sheet>

      {/* Product Form Sheet — edit only */}
      <Sheet
        open={sheetOpen && !!editingProduct}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditingProduct(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-l sm:max-w-3xl"
        >
          <SheetHeader>
            <SheetTitle>Edit Product</SheetTitle>
            <SheetDescription>
              Update details for {editingProduct?.productCode}
            </SheetDescription>
          </SheetHeader>
          {renderProductForm(() => setSheetOpen(false))}
        </SheetContent>
      </Sheet>

      {renderFormDialogs()}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteImpactQuery.isLoading ? (
                <>Checking whether this product can be deleted…</>
              ) : deleteImpactQuery.data?.canDelete ? (
                <>
                  This will permanently remove{' '}
                  <span className="font-medium text-foreground">
                    {deleteTarget?.description}
                  </span>{' '}
                  from the database.
                </>
              ) : (
                <>
                  {deleteImpactQuery.data?.reason ?? 'This product cannot be deleted right now.'}
                  {deleteImpactQuery.data?.plants?.length ? (
                    <>
                      {' '}Affected plants:{' '}
                      {deleteImpactQuery.data.plants
                        .map((plant) => `${plant.shopNumber} (${plant.currentStock})`)
                        .join(', ')}
                      .
                    </>
                  ) : null}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteProduct.isPending || updateProduct.isPending}
            >
              Cancel
            </AlertDialogCancel>
            {!deleteImpactQuery.isLoading && deleteImpactQuery.data && !deleteImpactQuery.data.canDelete ? (
              <AlertDialogAction
                className="bg-slate-900 text-white hover:bg-slate-800"
                disabled={updateProduct.isPending}
                onClick={handleDeactivateInstead}
              >
                {updateProduct.isPending ? 'Deactivating...' : 'Deactivate Instead'}
              </AlertDialogAction>
            ) : null}
            <AlertDialogAction
              className={cn(
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
              disabled={
                deleteProduct.isPending ||
                deleteImpactQuery.isLoading ||
                (!!deleteImpactQuery.data && !deleteImpactQuery.data.canDelete)
              }
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
