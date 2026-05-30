import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Download,
  PackageCheck,
  TrendingDown,
  Upload,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AppLayout } from '@/components/AppLayout';
import { ColumnFilter } from '@/components/shared/column-filter';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAlerts, useMarkAlertRead, useRunAlertChecks } from '@/hooks/use-alerts';
import { useDashboard } from '@/hooks/use-dashboard';
import {
  useBulkInventoryUpload,
  useProducts,
  type BulkInventoryRow,
  type Product,
} from '@/hooks/use-products';
import { useGoodsReceipts } from '@/hooks/use-goods-receipts';
import { useShops } from '@/hooks/use-shops';
import { useStorageLocations } from '@/hooks/use-storage-locations';
import { buildWarehouseExpiryMap, useWarehouseInventory } from '@/hooks/use-warehouse-inventory';
import { downloadCsv, parseCsv, toCsv, type CsvColumn } from '@/lib/csv';
import { isAdminUser, isShopOnlyUser, productListShopId } from '@/lib/shop-scope';
import { useAuthStore } from '@/store/authStore';

const CATEGORY_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#0ea5e9',
  '#22c55e',
  '#f97316',
  '#a855f7',
];

const TEMPLATE_HEADERS = [
  'product_code',
  'shop_number',
  'storage_location_code',
  'min_stock',
  'max_stock',
  'reorder_qty',
];

const DEFAULT_LOCATION_FILTER = '__default__';

type StockRow = {
  key: string;
  productId: string;
  sku: string;
  productName: string;
  shopId: string;
  storageLocationId: string;
  plant: string;
  location: string;
  currentStock: number;
  minStock: number;
  maxStock: number | null;
};

function flattenStockRows(
  products: Product[],
  shopNameById: Map<string, string>,
): StockRow[] {
  const rows: StockRow[] = [];
  for (const product of products) {
    const seenShopIds = new Set<string>();

    if (!product.plants?.length) {
      const stockByShop = product.stockByShop ?? {};
      const shopIds = Object.keys(stockByShop);
      if (shopIds.length === 0) {
        rows.push({
          key: `${product.id}-none`,
          productId: product.id,
          sku: product.productCode,
          productName: product.description,
          shopId: '',
          storageLocationId: '',
          plant: '-',
          location: 'DEFAULT',
          currentStock: Number(product.currentStock ?? product.totalStock ?? 0),
          minStock: 0,
          maxStock: null,
        });
        continue;
      }
      for (const shopId of shopIds) {
        seenShopIds.add(shopId);
        rows.push({
          key: `${product.id}-${shopId}-ledger`,
          productId: product.id,
          sku: product.productCode,
          productName: product.description,
          shopId,
          storageLocationId: '',
          plant: shopNameById.get(shopId) ?? '-',
          location: 'DEFAULT',
          currentStock: Number(stockByShop[shopId] ?? 0),
          minStock: 0,
          maxStock: null,
        });
      }
      continue;
    }

    for (const plant of product.plants) {
      seenShopIds.add(plant.shopId);
      const currentStock = Number(product.stockByShop?.[plant.shopId] ?? 0);
      rows.push({
        key: `${product.id}-${plant.shopId}-${plant.id ?? plant.storageLocationId ?? 'x'}`,
        productId: product.id,
        sku: product.productCode,
        productName: product.description,
        shopId: plant.shopId,
        storageLocationId: plant.storageLocationId ?? '',
        plant: shopNameById.get(plant.shopId) ?? '-',
        location: plant.storageLocation?.name || plant.storageLocation?.code || 'DEFAULT',
        currentStock,
        minStock: Number(plant.minStockLevel ?? 0),
        maxStock: plant.maxStockLevel == null ? null : Number(plant.maxStockLevel),
      });
    }

    for (const [shopId, qty] of Object.entries(product.stockByShop ?? {})) {
      if (seenShopIds.has(shopId)) continue;
      rows.push({
        key: `${product.id}-${shopId}-ledger`,
        productId: product.id,
        sku: product.productCode,
        productName: product.description,
        shopId,
        storageLocationId: '',
        plant: shopNameById.get(shopId) ?? '-',
        location: 'DEFAULT',
        currentStock: Number(qty ?? 0),
        minStock: 0,
        maxStock: null,
      });
    }
  }
  return rows;
}

function stockBadgeVariant(row: StockRow): {
  variant: 'destructive' | 'warning' | 'secondary';
  label: string;
} {
  if (row.currentStock <= 0) return { variant: 'destructive', label: String(row.currentStock) };
  if (row.minStock > 0 && row.currentStock < row.minStock) {
    return { variant: 'warning', label: String(row.currentStock) };
  }
  return { variant: 'secondary', label: String(row.currentStock) };
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 justify-center gap-2 rounded-full text-sm font-medium"
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

function KpiCard({
  title,
  value,
  hint,
  accent,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  hint?: string;
  accent: 'blue' | 'green' | 'amber';
  icon: React.ElementType;
}) {
  const accentClass = {
    blue: 'border-l-4 border-l-blue-500',
    green: 'border-l-4 border-l-emerald-500',
    amber: 'border-l-4 border-l-amber-500',
  }[accent];
  const iconBg = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  }[accent];
  return (
    <Card className={`${accentClass} surface-2`}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

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

function rowMatchesLocationFilter(row: StockRow, locationFilter: string): boolean {
  if (locationFilter === 'all') return true;
  if (locationFilter === DEFAULT_LOCATION_FILTER) {
    return !row.storageLocationId;
  }
  return row.storageLocationId === locationFilter;
}

export function WarehousePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminUser(user);
  const shopLocked = isShopOnlyUser(user);
  const { data: alerts = [] } = useAlerts();
  const runChecks = useRunAlertChecks();
  const markRead = useMarkAlertRead();
  const { data: dashboard } = useDashboard();
  const [plantFilter, setPlantFilter] = useState(
    shopLocked && user?.shopId ? user.shopId : 'all',
  );
  const [locationFilter, setLocationFilter] = useState('all');

  useEffect(() => {
    if (shopLocked && user?.shopId) {
      setPlantFilter(user.shopId);
    }
  }, [shopLocked, user?.shopId]);
  const listShopId = productListShopId(user, plantFilter);
  const productsQuery = useProducts({
    companyCatalog: true,
    isActive: true,
    limit: 500,
    page: 1,
    shopId: listShopId,
  });
  const postedGrQuery = useGoodsReceipts({
    status: 'POSTED',
    shopId: listShopId,
    limit: 200,
    page: 1,
  });
  const { data: shops = [] } = useShops();
  const selectedPlantId = plantFilter === 'all' ? undefined : plantFilter;
  const { data: storageLocations = [] } = useStorageLocations(selectedPlantId);
  const { data: warehouseInventory = [] } = useWarehouseInventory(listShopId);
  const warehouseExpiryMaps = useMemo(
    () => buildWarehouseExpiryMap(warehouseInventory),
    [warehouseInventory],
  );
  const products = useMemo(() => extractProductRows(productsQuery.data), [productsQuery.data]);
  const shopNameById = useMemo(
    () => new Map(shops.map((s) => [s.id, `${s.shopName}`])),
    [shops],
  );
  const shopNumberById = useMemo(
    () => new Map(shops.map((s) => [s.id, s.shopNumber])),
    [shops],
  );

  const stockRows = useMemo(
    () => flattenStockRows(products, shopNameById),
    [products, shopNameById],
  );

  /** Latest batch per product+plant from posted goods receipts (newest GR first). */
  const batchByProductShop = useMemo(() => {
    const map = new Map<string, string>();
    for (const gr of postedGrQuery.data?.items ?? []) {
      if (!gr.shopId) continue;
      for (const item of gr.items ?? []) {
        const batch = item.batchNumber?.trim();
        if (!batch) continue;
        const key = `${item.productId}:${gr.shopId}`;
        if (!map.has(key)) map.set(key, batch);
      }
    }
    return map;
  }, [postedGrQuery.data?.items]);

  const [search, setSearch] = useState('');

  const locationFilterOptions = useMemo(() => {
    if (selectedPlantId) {
      return storageLocations
        .filter((loc) => loc.isActive)
        .map((loc) => ({
          id: loc.id,
          label: loc.name || loc.code,
        }));
    }
    const seen = new Map<string, string>();
    for (const row of stockRows) {
      if (row.storageLocationId) {
        seen.set(row.storageLocationId, row.location);
      }
    }
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [selectedPlantId, storageLocations, stockRows]);

  const hasDefaultLocationRows = useMemo(
    () => stockRows.some((row) => !row.storageLocationId),
    [stockRows],
  );

  const plantFilteredRows = useMemo(() => {
    if (plantFilter === 'all') return stockRows;
    return stockRows.filter((row) => row.shopId === plantFilter);
  }, [stockRows, plantFilter]);

  const scopeFilteredRows = useMemo(() => {
    return plantFilteredRows.filter((row) => rowMatchesLocationFilter(row, locationFilter));
  }, [plantFilteredRows, locationFilter]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scopeFilteredRows;
    return scopeFilteredRows.filter((row) => {
      const locationKey = row.storageLocationId || 'default';
      const batchKey = row.shopId ? `${row.productId}:${row.shopId}:${locationKey}` : '';
      const batch =
        (batchKey ? warehouseExpiryMaps.batch.get(batchKey) : undefined) ??
        (row.shopId ? batchByProductShop.get(`${row.productId}:${row.shopId}`) : '') ??
        '';
      return (
        row.sku.toLowerCase().includes(q) ||
        row.productName.toLowerCase().includes(q) ||
        row.plant.toLowerCase().includes(q) ||
        row.location.toLowerCase().includes(q) ||
        batch.toLowerCase().includes(q)
      );
    });
  }, [scopeFilteredRows, search, batchByProductShop, warehouseExpiryMaps.batch]);

  const productsInStock = useMemo(
    () => scopeFilteredRows.filter((row) => row.currentStock > 0).length,
    [scopeFilteredRows],
  );
  const zeroStockCount = useMemo(
    () => scopeFilteredRows.filter((row) => row.currentStock <= 0).length,
    [scopeFilteredRows],
  );
  const totalUnits = useMemo(
    () =>
      scopeFilteredRows.reduce(
        (sum, row) => sum + (row.currentStock > 0 ? row.currentStock : 0),
        0,
      ),
    [scopeFilteredRows],
  );

  const topByStock = useMemo(() => {
    return [...scopeFilteredRows]
      .filter((row) => row.currentStock > 0)
      .sort((a, b) => b.currentStock - a.currentStock)
      .slice(0, 8)
      .map((row) => ({ name: row.productName, stock: row.currentStock }));
  }, [scopeFilteredRows]);

  const categoryData = dashboard?.categoryBreakdown ?? [];

  const onExport = () => {
    const columns: CsvColumn<StockRow>[] = [
      { header: 'SKU', value: (r) => r.sku },
      { header: 'Product', value: (r) => r.productName },
      { header: 'Plant', value: (r) => r.plant },
      { header: 'Location', value: (r) => r.location },
      {
        header: 'Batch',
        value: (r) => {
          if (!r.shopId) return '';
          const locationKey = r.storageLocationId || 'default';
          const detailedKey = `${r.productId}:${r.shopId}:${locationKey}`;
          return (
            warehouseExpiryMaps.batch.get(detailedKey) ??
            batchByProductShop.get(`${r.productId}:${r.shopId}`) ??
            ''
          );
        },
      },
      {
        header: 'Expiry',
        value: (r) => {
          const locationKey = r.storageLocationId || 'default';
          const key = r.shopId ? `${r.productId}:${r.shopId}:${locationKey}` : '';
          return key ? warehouseExpiryMaps.expiry.get(key) ?? '' : '';
        },
      },
      { header: 'Current Stock', value: (r) => r.currentStock },
      { header: 'Min Stock', value: (r) => r.minStock },
      { header: 'Max Stock', value: (r) => (r.maxStock == null ? '' : r.maxStock) },
    ];
    downloadCsv('inventory.csv', toCsv(filteredRows, columns));
    toast.success(`Exported ${filteredRows.length} row(s)`);
  };

  return (
    <AppLayout active="Warehouse">
      <div className="space-y-6">
        <PageHeader
          title="Warehouse"
          description="Stock overview, bulk inventory tools, and operational alerts."
        >
          <Button onClick={() => runChecks.mutate()} disabled={runChecks.isPending}>
            {runChecks.isPending ? 'Checking...' : 'Run Automation Checks'}
          </Button>
        </PageHeader>

        <Card className="surface-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Stock Overview</CardTitle>
            <p className="text-sm text-muted-foreground">
              One row per product-plant-location. Products assigned to a plant always appear here
              (at 0 until stock is received).
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard
                title="Total Products"
                value={dashboard?.totalProducts ?? products.length}
                hint={`${scopeFilteredRows.length} slot(s) in current view`}
                accent="blue"
                icon={PackageCheck}
              />
              <KpiCard
                title="Products in Stock"
                value={productsInStock}
                hint={`${zeroStockCount} at zero · ${totalUnits.toLocaleString()} total units`}
                accent="green"
                icon={PackageCheck}
              />
              <KpiCard
                title="Low Stock Items"
                value={dashboard?.lowStockCount ?? 0}
                hint="below minimum — need reorder"
                accent="amber"
                icon={TrendingDown}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <QuickAction
                icon={ArrowDownToLine}
                label="Goods Receipt"
                onClick={() => navigate('/goods-receipts')}
              />
              <QuickAction
                icon={ArrowUpFromLine}
                label="Goods Issue"
                onClick={() => navigate('/goods-issues')}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="surface-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Stock by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryData.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      No category data yet.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="count"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                        >
                          {categoryData.map((_, index) => (
                            <Cell
                              key={index}
                              fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="surface-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Stock Levels Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topByStock.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      No stock recorded yet.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={topByStock} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" fontSize={11} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          fontSize={11}
                          width={110}
                          tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 16)}…` : v)}
                        />
                        <Tooltip />
                        <Bar dataKey="stock" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {dashboard && dashboard.lowStockCount > 0 && (
              <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-semibold">Low Stock Alert</p>
                    <p className="text-sm">
                      {dashboard.lowStockCount} item(s) are below minimum stock levels.
                    </p>
                  </div>
                </div>
                <Button
                  variant="link"
                  className="self-start text-amber-900 sm:self-auto"
                  onClick={() => navigate('/notifications')}
                >
                  View All →
                </Button>
              </div>
            )}

            <StockTableSection
              rows={filteredRows}
              totalCount={scopeFilteredRows.length}
              search={search}
              onSearch={setSearch}
              onExport={onExport}
              shopNumberById={shopNumberById}
              batchByProductShop={batchByProductShop}
              batchByProductShopLocation={warehouseExpiryMaps.batch}
              expiryByProductShopLocation={warehouseExpiryMaps.expiry}
              shops={shops}
              showPlantFilter={isAdmin && shops.length > 0}
              plantFilter={plantFilter}
              onPlantFilterChange={(value) => {
                setPlantFilter(value);
                setLocationFilter('all');
              }}
              locationFilter={locationFilter}
              onLocationFilterChange={setLocationFilter}
              locationOptions={locationFilterOptions}
              hasDefaultLocationRows={hasDefaultLocationRows}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alert Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>No alerts.</TableCell>
                  </TableRow>
                ) : (
                  alerts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.alertType}</TableCell>
                      <TableCell>{a.title}</TableCell>
                      <TableCell>{a.message}</TableCell>
                      <TableCell>{a.isRead ? 'Read' : 'Unread'}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markRead.mutate(a.id)}
                        >
                          Mark read
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function StockTableSection({
  rows,
  totalCount,
  search,
  onSearch,
  onExport,
  shopNumberById,
  batchByProductShop,
  batchByProductShopLocation,
  expiryByProductShopLocation,
  shops,
  showPlantFilter,
  plantFilter,
  onPlantFilterChange,
  locationFilter,
  onLocationFilterChange,
  locationOptions,
  hasDefaultLocationRows,
}: {
  rows: StockRow[];
  totalCount: number;
  search: string;
  onSearch: (next: string) => void;
  onExport: () => void;
  shopNumberById: Map<string, string>;
  batchByProductShop: Map<string, string>;
  batchByProductShopLocation: Map<string, string>;
  expiryByProductShopLocation: Map<string, string>;
  shops: Array<{ id: string; shopName: string; shopNumber: string }>;
  showPlantFilter: boolean;
  plantFilter: string;
  onPlantFilterChange: (value: string) => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  locationOptions: Array<{ id: string; label: string }>;
  hasDefaultLocationRows: boolean;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);

  const plantOptions = useMemo(
    () => shops.map((s) => ({ value: s.id, label: s.shopName })),
    [shops],
  );

  const storageOptions = useMemo(() => {
    const opts = locationOptions.map((loc) => ({ value: loc.id, label: loc.label }));
    if (hasDefaultLocationRows) {
      opts.unshift({ value: DEFAULT_LOCATION_FILTER, label: 'Default / unassigned' });
    }
    return opts;
  }, [hasDefaultLocationRows, locationOptions]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Showing {rows.length} of {totalCount} entries. Each row = one product at one
        plant/storage location.
      </p>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by product name or SKU..."
            className="h-9 w-full sm:max-w-xs"
          />
          <div className="flex flex-wrap items-center gap-1">
            {showPlantFilter ? (
              <ColumnFilter
                label="SHOP"
                filterLabel="Filter by plant"
                value={plantFilter}
                onChange={onPlantFilterChange}
                options={plantOptions}
                allValue="all"
                allLabel="All plants"
              />
            ) : null}
            <ColumnFilter
              label="STORAGE"
              filterLabel="Filter by storage location"
              value={locationFilter}
              onChange={onLocationFilterChange}
              options={storageOptions}
              allValue="all"
              allLabel="All locations"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload Inventory
          </Button>
          <Button variant="outline" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Plant</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Min Stock</TableHead>
              <TableHead className="text-right">Max Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                  No inventory rows found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const stock = stockBadgeVariant(row);
                const belowMin = row.minStock > 0 && row.currentStock < row.minStock;
                const locationKey = row.storageLocationId || 'default';
                const inventoryKey = row.shopId
                  ? `${row.productId}:${row.shopId}:${locationKey}`
                  : '';
                const batch = inventoryKey
                  ? (batchByProductShopLocation.get(inventoryKey) ??
                    (row.shopId
                      ? batchByProductShop.get(`${row.productId}:${row.shopId}`)
                      : undefined))
                  : undefined;
                const expiry = inventoryKey
                  ? expiryByProductShopLocation.get(inventoryKey)
                  : undefined;
                return (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium text-indigo-600">{row.sku}</TableCell>
                    <TableCell>{row.productName}</TableCell>
                    <TableCell>{row.plant}</TableCell>
                    <TableCell>{row.location}</TableCell>
                    <TableCell className="text-sm">{batch ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {expiry ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={stock.variant}>{stock.label}</Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right ${belowMin ? 'text-amber-600 font-medium' : ''}`}
                    >
                      {row.minStock || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.maxStock == null ? '—' : row.maxStock}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <UploadInventoryDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        rows={rows}
        shopNumberById={shopNumberById}
      />
    </div>
  );
}

function UploadInventoryDialog({
  open,
  onOpenChange,
  rows,
  shopNumberById,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  rows: StockRow[];
  shopNumberById: Map<string, string>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<BulkInventoryRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const upload = useBulkInventoryUpload();

  useEffect(() => {
    if (!open) {
      setFile(null);
      setParsedRows([]);
      setParseError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open]);

  const downloadTemplate = () => {
    const headerLine = TEMPLATE_HEADERS.join(',');
    const sampleRow = rows.slice(0, 1).map((row) => {
      return [
        row.sku,
        shopNumberById.get(row.shopId) ?? '',
        row.location === 'DEFAULT' ? '' : row.location,
        row.minStock,
        row.maxStock ?? '',
        '',
      ].join(',');
    });
    const csv = sampleRow.length ? `${headerLine}\r\n${sampleRow.join('\r\n')}` : headerLine;
    downloadCsv('inventory-template.csv', csv);
  };

  const onFileSelected = async (selected: File | null) => {
    setFile(selected);
    setParseError(null);
    setParsedRows([]);
    if (!selected) return;
    try {
      const text = await selected.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setParseError('CSV is empty or missing data rows.');
        return;
      }
      const mapped: BulkInventoryRow[] = parsed.map((record, idx) => {
        const productCode = (record.product_code ?? record.productCode ?? '').trim();
        const shopNumber = (record.shop_number ?? record.shopNumber ?? '').trim();
        if (!productCode || !shopNumber) {
          throw new Error(
            `Row ${idx + 2}: product_code and shop_number are required`,
          );
        }
        const toOptionalNumber = (raw: string | undefined) => {
          if (raw === undefined || raw.trim() === '') return undefined;
          const n = Number(raw);
          if (!Number.isFinite(n)) {
            throw new Error(`Row ${idx + 2}: invalid number "${raw}"`);
          }
          return n;
        };
        return {
          productCode,
          shopNumber,
          storageLocationCode:
            (record.storage_location_code ?? record.storageLocationCode ?? '').trim() || undefined,
          minStock: toOptionalNumber(record.min_stock ?? record.minStock),
          maxStock: toOptionalNumber(record.max_stock ?? record.maxStock),
          reorderQty: toOptionalNumber(record.reorder_qty ?? record.reorderQty),
        };
      });
      setParsedRows(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read CSV';
      setParseError(message);
    }
  };

  const onUpload = async () => {
    if (parsedRows.length === 0) return;
    try {
      const result = await upload.mutateAsync(parsedRows);
      if (result.errors.length > 0) {
        toast.warning(
          `Updated ${result.updated} of ${result.total}. ${result.errors.length} row(s) failed.`,
        );
        // eslint-disable-next-line no-console
        console.warn('Bulk inventory errors', result.errors);
      } else {
        toast.success(`Updated ${result.updated} row(s)`);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? 'Failed to upload inventory';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Inventory (CSV)</DialogTitle>
          <DialogDescription>
            Fill in the template and upload below. Existing records will be updated by key
            (product_code + shop_number + storage_location_code).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" /> Download Template
          </Button>

          <label
            htmlFor="inventory-csv-file"
            className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 text-sm text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600"
          >
            <Upload className="h-6 w-6" />
            <span>
              {file ? file.name : 'Click to select CSV file'}
            </span>
            <input
              ref={fileInputRef}
              id="inventory-csv-file"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
            />
          </label>

          {parseError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {parseError}
            </p>
          )}

          {parsedRows.length > 0 && !parseError && (
            <p className="text-xs text-muted-foreground">
              Parsed {parsedRows.length} row(s) — click Upload to apply.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={upload.isPending}>
            Close
          </Button>
          <Button
            onClick={onUpload}
            disabled={parsedRows.length === 0 || !!parseError || upload.isPending}
          >
            {upload.isPending ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
