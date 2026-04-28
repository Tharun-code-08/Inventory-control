import { useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download, Search, AlertTriangle, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  useInventoryReport,
  useLowStockReport,
  useStockLedger,
  useGrRegister,
  useGiRegister,
  useShopSummary,
  useExportReport,
  type ReportFilters,
} from '@/hooks/use-reports';
import { useShops } from '@/hooks/use-shops';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/AppLayout';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

type FilterBarProps = {
  filters: ReportFilters;
  onChange: (f: Partial<ReportFilters>) => void;
  onExport: () => void;
  exporting: boolean;
  isAdmin: boolean;
  shops: Array<{ id: string; name: string }>;
  showProductSearch?: boolean;
  productSearch?: string;
  onProductSearchChange?: (v: string) => void;
};

function FilterBar({
  filters,
  onChange,
  onExport,
  exporting,
  isAdmin,
  shops,
  showProductSearch,
  productSearch,
  onProductSearchChange,
}: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="w-full space-y-1 sm:w-auto">
        <Label className="text-xs">From</Label>
        <Input
          type="date"
          className="w-full sm:w-[150px]"
          value={filters.dateFrom ?? ''}
          onChange={(e) => onChange({ dateFrom: e.target.value || undefined })}
        />
      </div>
      <div className="w-full space-y-1 sm:w-auto">
        <Label className="text-xs">To</Label>
        <Input
          type="date"
          className="w-full sm:w-[150px]"
          value={filters.dateTo ?? ''}
          onChange={(e) => onChange({ dateTo: e.target.value || undefined })}
        />
      </div>
      <div className="w-full space-y-1 sm:w-auto">
        <Label className="text-xs">Category</Label>
        <Select
          value={filters.category ?? '_all'}
          onValueChange={(v) =>
            onChange({ category: v === '_all' ? undefined : v })
          }
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Categories</SelectItem>
            <SelectItem value="Electronics">Electronics</SelectItem>
            <SelectItem value="Groceries">Groceries</SelectItem>
            <SelectItem value="Clothing">Clothing</SelectItem>
            <SelectItem value="Stationery">Stationery</SelectItem>
            <SelectItem value="General">General</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isAdmin && (
        <div className="w-full space-y-1 sm:w-auto">
          <Label className="text-xs">Shop</Label>
          <Select
            value={filters.shopId ?? '_all'}
            onValueChange={(v) =>
              onChange({ shopId: v === '_all' ? undefined : v })
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Shops</SelectItem>
              {shops.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {showProductSearch && (
        <div className="w-full space-y-1 sm:w-auto">
          <Label className="text-xs">Product</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="w-full pl-8 sm:w-[200px]"
              placeholder="Search product..."
              value={productSearch ?? ''}
              onChange={(e) => onProductSearchChange?.(e.target.value)}
            />
          </div>
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onExport}
        disabled={exporting}
        className="w-full sm:ml-auto sm:w-auto"
      >
        <Download className="h-4 w-4 mr-1.5" />
        {exporting ? 'Exporting...' : 'Export CSV'}
      </Button>
    </div>
  );
}

// --- Tab panels ---

function InventoryTab({
  filters,
  onChange,
  onExport,
  exporting,
  isAdmin,
  shops,
}: {
  filters: ReportFilters;
  onChange: (f: Partial<ReportFilters>) => void;
  onExport: (type: string) => void;
  exporting: boolean;
  isAdmin: boolean;
  shops: Array<{ id: string; name: string }>;
}) {
  const { data, isLoading } = useInventoryReport(filters);
  const rows = (data?.items ?? data ?? []) as Array<{
    id: string;
    productCode: string;
    description: string;
    category: string;
    openingStock: number;
    currentStock: number;
    minStockLevel: number;
    value: number;
  }>;

  const chartData = rows.reduce(
    (acc: Array<{ category: string; stock: number }>, item) => {
      const existing = acc.find((a) => a.category === item.category);
      if (existing) {
        existing.stock += item.currentStock;
      } else {
        acc.push({ category: item.category, stock: item.currentStock });
      }
      return acc;
    },
    [],
  );

  return (
    <div>
      <FilterBar
        filters={filters}
        onChange={onChange}
        onExport={() => onExport('inventory')}
        exporting={exporting}
        isAdmin={isAdmin}
        shops={shops}
      />
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Min Stock</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <EmptyRow colSpan={7} message="No inventory data found." />
              ) : (
                rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.productCode}
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.openingStock}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.currentStock}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.minStockLevel}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{item.value?.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {chartData.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">Stock by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="category" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="stock" name="Total Stock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function LowStockTab({
  filters,
  onChange,
  onExport,
  exporting,
  isAdmin,
  shops,
}: {
  filters: ReportFilters;
  onChange: (f: Partial<ReportFilters>) => void;
  onExport: (type: string) => void;
  exporting: boolean;
  isAdmin: boolean;
  shops: Array<{ id: string; name: string }>;
}) {
  const { data, isLoading } = useLowStockReport(filters);
  const rows = (data?.items ?? data ?? []) as Array<{
    id: string;
    productCode: string;
    description: string;
    category: string;
    currentStock: number;
    minStockLevel: number;
  }>;

  return (
    <div>
      <FilterBar
        filters={filters}
        onChange={onChange}
        onExport={() => onExport('low-stock')}
        exporting={exporting}
        isAdmin={isAdmin}
        shops={shops}
      />
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Min Level</TableHead>
              <TableHead className="text-right">Shortfall</TableHead>
              <TableHead>Severity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={7} message="No low-stock products found." />
            ) : (
              rows.map((item) => {
                const shortfall = item.minStockLevel - item.currentStock;
                const ratio =
                  item.minStockLevel > 0
                    ? item.currentStock / item.minStockLevel
                    : 0;
                const severity =
                  ratio === 0
                    ? 'Out of Stock'
                    : ratio < 0.25
                      ? 'Critical'
                      : ratio < 0.5
                        ? 'Very Low'
                        : 'Low';
                const variant: 'destructive' | 'warning' =
                  ratio < 0.25 ? 'destructive' : 'warning';
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.productCode}
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.currentStock}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.minStockLevel}
                    </TableCell>
                    <TableCell className="text-right text-destructive font-medium">
                      -{shortfall}
                    </TableCell>
                    <TableCell>
                      <Badge variant={variant}>{severity}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function StockLedgerTab({
  filters,
  onChange,
  onExport,
  exporting,
  isAdmin,
  shops,
}: {
  filters: ReportFilters;
  onChange: (f: Partial<ReportFilters>) => void;
  onExport: (type: string) => void;
  exporting: boolean;
  isAdmin: boolean;
  shops: Array<{ id: string; name: string }>;
}) {
  const [productSearch, setProductSearch] = useState('');
  const { data, isLoading } = useStockLedger(filters);
  const rows = (data?.items ?? data ?? []) as Array<{
    id: string;
    date: string;
    productCode: string;
    description: string;
    type: string;
    inQty: number;
    outQty: number;
    balance: number;
    reference: string;
  }>;

  const filtered = productSearch
    ? rows.filter(
        (r) =>
          r.productCode?.toLowerCase().includes(productSearch.toLowerCase()) ||
          r.description?.toLowerCase().includes(productSearch.toLowerCase()),
      )
    : rows;

  return (
    <div>
      <FilterBar
        filters={filters}
        onChange={onChange}
        onExport={() => onExport('stock-ledger')}
        exporting={exporting}
        isAdmin={isAdmin}
        shops={shops}
        showProductSearch
        productSearch={productSearch}
        onProductSearchChange={setProductSearch}
      />
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">In Qty</TableHead>
              <TableHead className="text-right">Out Qty</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <EmptyRow colSpan={7} message="No ledger entries found." />
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {new Date(row.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{row.productCode}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.type} />
                  </TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">
                    {row.inQty > 0 ? `+${row.inQty}` : '-'}
                  </TableCell>
                  <TableCell className="text-right text-red-600 font-medium">
                    {row.outQty > 0 ? `-${row.outQty}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {row.balance}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.reference}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function GrRegisterTab({
  filters,
  onChange,
  onExport,
  exporting,
  isAdmin,
  shops,
}: {
  filters: ReportFilters;
  onChange: (f: Partial<ReportFilters>) => void;
  onExport: (type: string) => void;
  exporting: boolean;
  isAdmin: boolean;
  shops: Array<{ id: string; name: string }>;
}) {
  const { data, isLoading } = useGrRegister(filters);
  const rows = (data?.items ?? data ?? []) as Array<{
    id: string;
    grNumber: string;
    grDate: string;
    supplier: string;
    itemCount: number;
    totalValue: number;
    status: string;
  }>;

  const monthlyTotals = rows.reduce(
    (acc: Array<{ month: string; value: number; count: number }>, row) => {
      const month = new Date(row.grDate).toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
      const existing = acc.find((a) => a.month === month);
      if (existing) {
        existing.value += row.totalValue ?? 0;
        existing.count += 1;
      } else {
        acc.push({ month, value: row.totalValue ?? 0, count: 1 });
      }
      return acc;
    },
    [],
  );

  return (
    <div>
      <FilterBar
        filters={filters}
        onChange={onChange}
        onExport={() => onExport('gr-register')}
        exporting={exporting}
        isAdmin={isAdmin}
        shops={shops}
      />
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GR Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <EmptyRow colSpan={6} message="No goods receipts found." />
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.grNumber}
                    </TableCell>
                    <TableCell>
                      {new Date(row.grDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{row.supplier}</TableCell>
                    <TableCell className="text-right">
                      {row.itemCount}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{row.totalValue?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {monthlyTotals.length > 1 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">
                  Monthly GR Totals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyTotals}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Total Value (₹)"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="GR Count"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function GiRegisterTab({
  filters,
  onChange,
  onExport,
  exporting,
  isAdmin,
  shops,
}: {
  filters: ReportFilters;
  onChange: (f: Partial<ReportFilters>) => void;
  onExport: (type: string) => void;
  exporting: boolean;
  isAdmin: boolean;
  shops: Array<{ id: string; name: string }>;
}) {
  const { data, isLoading } = useGiRegister(filters);
  const rows = (data?.items ?? data ?? []) as Array<{
    id: string;
    giNumber: string;
    giDate: string;
    issueReason: string;
    itemCount: number;
    status: string;
  }>;

  const monthlyTotals = rows.reduce(
    (acc: Array<{ month: string; count: number }>, row) => {
      const month = new Date(row.giDate).toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
      const existing = acc.find((a) => a.month === month);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ month, count: 1 });
      }
      return acc;
    },
    [],
  );

  return (
    <div>
      <FilterBar
        filters={filters}
        onChange={onChange}
        onExport={() => onExport('gi-register')}
        exporting={exporting}
        isAdmin={isAdmin}
        shops={shops}
      />
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GI Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <EmptyRow colSpan={5} message="No goods issues found." />
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.giNumber}
                    </TableCell>
                    <TableCell>
                      {new Date(row.giDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{row.issueReason}</TableCell>
                    <TableCell className="text-right">
                      {row.itemCount}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {monthlyTotals.length > 1 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">
                  Monthly GI Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyTotals}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      name="Issues"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ShopSummaryTab({
  filters,
  onChange,
  onExport,
  exporting,
  isAdmin,
  shops,
}: {
  filters: ReportFilters;
  onChange: (f: Partial<ReportFilters>) => void;
  onExport: (type: string) => void;
  exporting: boolean;
  isAdmin: boolean;
  shops: Array<{ id: string; name: string }>;
}) {
  const { data, isLoading } = useShopSummary(filters);
  const rows = (data?.items ?? data ?? []) as Array<{
    shopId: string;
    shopName: string;
    totalProducts: number;
    totalStockValue: number;
    lowStockCount: number;
    totalGR: number;
    totalGI: number;
  }>;

  return (
    <div>
      <FilterBar
        filters={filters}
        onChange={onChange}
        onExport={() => onExport('shop-summary')}
        exporting={exporting}
        isAdmin={isAdmin}
        shops={shops}
      />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Store className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No shop data available.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((shop) => (
            <Card key={shop.shopId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  {shop.shopName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Products</span>
                  <span className="font-medium">{shop.totalProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stock Value</span>
                  <span className="font-medium">
                    ₹{shop.totalStockValue?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Low Stock</span>
                  <span className="font-medium text-amber-600">
                    {shop.lowStockCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Goods Receipts</span>
                  <span className="font-medium">{shop.totalGR}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Goods Issues</span>
                  <span className="font-medium">{shop.totalGI}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main component ---

export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';

  const [filters, setFilters] = useState<ReportFilters>({});
  const { data: shopsData } = useShops();
  const shops = (shopsData ?? []).map((s) => ({ id: s.id, name: s.name }));

  const exportReport = useExportReport();

  const updateFilters = useCallback((partial: Partial<ReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleExport = useCallback(
    async (reportType: string) => {
      try {
        const blob = await exportReport.mutateAsync({
          ...filters,
          reportType,
          format: 'csv',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-report.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Report exported successfully.');
      } catch {
        toast.error('Failed to export report.');
      }
    },
    [filters, exportReport],
  );

  const tabProps = {
    filters,
    onChange: updateFilters,
    onExport: handleExport,
    exporting: exportReport.isPending,
    isAdmin,
    shops,
  };

  return (
    <AppLayout active="Reports">
      <div className="space-y-6">
        <PageHeader
          title="Reports & Analytics"
          description="View inventory reports, stock movements, and analytics"
        />

        <Tabs defaultValue="inventory" className="space-y-4">
          <TabsList className="flex w-full flex-wrap h-auto gap-1 overflow-x-auto">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
            <TabsTrigger value="stock-ledger">Stock Ledger</TabsTrigger>
            <TabsTrigger value="gr-register">GR Register</TabsTrigger>
            <TabsTrigger value="gi-register">GI Register</TabsTrigger>
            <TabsTrigger value="shop-summary">Shop Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            <Card>
              <CardContent className="pt-6">
                <InventoryTab {...tabProps} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="low-stock">
            <Card>
              <CardContent className="pt-6">
                <LowStockTab {...tabProps} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stock-ledger">
            <Card>
              <CardContent className="pt-6">
                <StockLedgerTab {...tabProps} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gr-register">
            <Card>
              <CardContent className="pt-6">
                <GrRegisterTab {...tabProps} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gi-register">
            <Card>
              <CardContent className="pt-6">
                <GiRegisterTab {...tabProps} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shop-summary">
            <Card>
              <CardContent className="pt-6">
                <ShopSummaryTab {...tabProps} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
