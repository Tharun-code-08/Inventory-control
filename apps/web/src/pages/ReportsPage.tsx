import { useState, useCallback, useMemo } from 'react';
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
import { Download, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { ColumnFilter, DateRangeColumnFilter } from '@/components/shared/column-filter';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  useLowStockReport,
  useStockLedger,
  useGrRegister,
  useGiRegister,
  useShopSummary,
  type ReportFilters,
} from '@/hooks/use-reports';
import { useShops } from '@/hooks/use-shops';
import { useProductCategories } from '@/hooks/use-product-categories';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/AppLayout';
import { exportReportCsv } from '@/lib/report-csv-export';
import type { CsvColumn } from '@/lib/csv';

const ALL = '_all';

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

function ReportExportButton({
  onExport,
  disabled,
}: {
  onExport: () => void;
  disabled?: boolean;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onExport} disabled={disabled} className="shrink-0">
      <Download className="mr-1.5 h-4 w-4" />
      Export CSV
    </Button>
  );
}

type TabShellProps = {
  filters: ReportFilters;
  onChange: (f: Partial<ReportFilters>) => void;
  isAdmin: boolean;
  shops: Array<{ id: string; name: string }>;
  categoryOptions: Array<{ value: string; label: string }>;
};

function LowStockTab({
  filters,
  onChange,
  isAdmin,
  shops,
  categoryOptions,
}: TabShellProps) {
  const { data, isLoading } = useLowStockReport(filters);
  const rows = data ?? [];

  const categoryValue = filters.category ?? ALL;
  const shopValue = filters.shopId ?? ALL;

  const handleExport = () => {
    const ok = exportReportCsv('low-stock-report.csv', rows, [
      { header: 'Product Code', value: (r) => r.productCode },
      { header: 'Description', value: (r) => r.description },
      { header: 'Category', value: (r) => r.category },
      { header: 'Current Stock', value: (r) => r.currentStock },
      { header: 'Min Level', value: (r) => r.minStockLevel },
    ]);
    if (ok) toast.success('Report exported.');
    else toast.error('No rows to export.');
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {isAdmin ? (
          <ColumnFilter
            label="SHOP"
            filterLabel="Filter by Shop"
            value={shopValue}
            onChange={(v) => onChange({ shopId: v === ALL ? undefined : v })}
            options={shops.map((s) => ({ value: s.id, label: s.name }))}
          />
        ) : (
          <span />
        )}
        <ReportExportButton onExport={handleExport} disabled={isLoading} />
      </div>
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>
                <ColumnFilter
                  label="CATEGORY"
                  filterLabel="Filter by Category"
                  value={categoryValue}
                  onChange={(v) =>
                    onChange({ category: v === ALL ? undefined : v })
                  }
                  options={categoryOptions}
                />
              </TableHead>
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
                    <TableCell className="font-medium">{item.productCode}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.currentStock}</TableCell>
                    <TableCell className="text-right">{item.minStockLevel}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">
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
  isAdmin,
  shops,
}: TabShellProps) {
  const [productFilter, setProductFilter] = useState(ALL);
  const { data, isLoading } = useStockLedger(filters);
  const rows = data ?? [];

  const productOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of rows) {
      const key = row.productCode;
      if (key && !seen.has(key)) {
        seen.set(key, `${row.productCode} — ${row.description}`);
      }
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [rows]);

  const filtered =
    productFilter === ALL
      ? rows
      : rows.filter((r) => r.productCode === productFilter);

  const shopValue = filters.shopId ?? ALL;

  const handleExport = () => {
    const ok = exportReportCsv('stock-ledger-report.csv', filtered, [
      { header: 'Date', value: (r) => new Date(r.date).toLocaleDateString() },
      { header: 'Product Code', value: (r) => r.productCode },
      { header: 'Description', value: (r) => r.description },
      { header: 'Type', value: (r) => r.type },
      { header: 'In Qty', value: (r) => r.inQty },
      { header: 'Out Qty', value: (r) => r.outQty },
      { header: 'Balance', value: (r) => r.balance },
      { header: 'Reference', value: (r) => r.reference },
    ]);
    if (ok) toast.success('Report exported.');
    else toast.error('No rows to export.');
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {isAdmin ? (
          <ColumnFilter
            label="SHOP"
            filterLabel="Filter by Shop"
            value={shopValue}
            onChange={(v) => onChange({ shopId: v === ALL ? undefined : v })}
            options={shops.map((s) => ({ value: s.id, label: s.name }))}
          />
        ) : (
          <span />
        )}
        <ReportExportButton onExport={handleExport} disabled={isLoading} />
      </div>
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <DateRangeColumnFilter
                  dateFrom={filters.dateFrom}
                  dateTo={filters.dateTo}
                  onChange={(from, to) => onChange({ dateFrom: from, dateTo: to })}
                />
              </TableHead>
              <TableHead>
                <ColumnFilter
                  label="PRODUCT"
                  filterLabel="Filter by Product"
                  value={productFilter}
                  onChange={setProductFilter}
                  options={productOptions}
                />
              </TableHead>
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
                  <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="font-medium">{row.productCode}</div>
                    <div className="text-xs text-muted-foreground">{row.description}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.type} />
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">
                    {row.inQty > 0 ? `+${row.inQty}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    {row.outQty > 0 ? `-${row.outQty}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">{row.balance}</TableCell>
                  <TableCell className="text-muted-foreground">{row.reference}</TableCell>
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
  isAdmin,
  shops,
}: TabShellProps) {
  const [supplierFilter, setSupplierFilter] = useState(ALL);
  const { data, isLoading } = useGrRegister(filters);
  const rows = data ?? [];

  const supplierOptions = useMemo(() => {
    const names = [...new Set(rows.map((r) => r.supplier).filter(Boolean))].sort();
    return names.map((name) => ({ value: name, label: name }));
  }, [rows]);

  const filtered =
    supplierFilter === ALL
      ? rows
      : rows.filter((r) => r.supplier === supplierFilter);

  const shopValue = filters.shopId ?? ALL;

  const monthlyTotals = filtered.reduce(
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

  const handleExport = () => {
    const ok = exportReportCsv('gr-register-report.csv', filtered, [
      { header: 'GR Number', value: (r) => r.grNumber },
      { header: 'Date', value: (r) => new Date(r.grDate).toLocaleDateString() },
      { header: 'Supplier', value: (r) => r.supplier },
      { header: 'Items', value: (r) => r.itemCount },
      { header: 'Total Value', value: (r) => r.totalValue },
      { header: 'Status', value: (r) => r.status },
    ]);
    if (ok) toast.success('Report exported.');
    else toast.error('No rows to export.');
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {isAdmin ? (
          <ColumnFilter
            label="SHOP"
            filterLabel="Filter by Shop"
            value={shopValue}
            onChange={(v) => onChange({ shopId: v === ALL ? undefined : v })}
            options={shops.map((s) => ({ value: s.id, label: s.name }))}
          />
        ) : (
          <span />
        )}
        <ReportExportButton onExport={handleExport} disabled={isLoading} />
      </div>
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GR Number</TableHead>
                <TableHead>
                  <DateRangeColumnFilter
                    dateFrom={filters.dateFrom}
                    dateTo={filters.dateTo}
                    onChange={(from, to) => onChange({ dateFrom: from, dateTo: to })}
                  />
                </TableHead>
                <TableHead>
                  <ColumnFilter
                    label="SUPPLIER"
                    filterLabel="Filter by Supplier"
                    value={supplierFilter}
                    onChange={setSupplierFilter}
                    options={supplierOptions}
                  />
                </TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <EmptyRow colSpan={6} message="No goods receipts found." />
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.grNumber}</TableCell>
                    <TableCell>{new Date(row.grDate).toLocaleDateString()}</TableCell>
                    <TableCell>{row.supplier}</TableCell>
                    <TableCell className="text-right">{row.itemCount}</TableCell>
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
                <CardTitle className="text-sm">Monthly GR Totals</CardTitle>
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
  isAdmin,
  shops,
}: TabShellProps) {
  const [reasonFilter, setReasonFilter] = useState(ALL);
  const { data, isLoading } = useGiRegister(filters);
  const rows = data ?? [];

  const reasonOptions = useMemo(() => {
    const reasons = [...new Set(rows.map((r) => r.issueReason).filter(Boolean))].sort();
    return reasons.map((r) => ({ value: r, label: r }));
  }, [rows]);

  const filtered =
    reasonFilter === ALL ? rows : rows.filter((r) => r.issueReason === reasonFilter);

  const shopValue = filters.shopId ?? ALL;

  const monthlyTotals = filtered.reduce(
    (acc: Array<{ month: string; count: number }>, row) => {
      const month = new Date(row.giDate).toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
      const existing = acc.find((a) => a.month === month);
      if (existing) existing.count += 1;
      else acc.push({ month, count: 1 });
      return acc;
    },
    [],
  );

  const handleExport = () => {
    const ok = exportReportCsv('gi-register-report.csv', filtered, [
      { header: 'GI Number', value: (r) => r.giNumber },
      { header: 'Date', value: (r) => new Date(r.giDate).toLocaleDateString() },
      { header: 'Reason', value: (r) => r.issueReason },
      { header: 'Items', value: (r) => r.itemCount },
      { header: 'Status', value: (r) => r.status },
    ]);
    if (ok) toast.success('Report exported.');
    else toast.error('No rows to export.');
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {isAdmin ? (
          <ColumnFilter
            label="SHOP"
            filterLabel="Filter by Shop"
            value={shopValue}
            onChange={(v) => onChange({ shopId: v === ALL ? undefined : v })}
            options={shops.map((s) => ({ value: s.id, label: s.name }))}
          />
        ) : (
          <span />
        )}
        <ReportExportButton onExport={handleExport} disabled={isLoading} />
      </div>
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GI Number</TableHead>
                <TableHead>
                  <DateRangeColumnFilter
                    dateFrom={filters.dateFrom}
                    dateTo={filters.dateTo}
                    onChange={(from, to) => onChange({ dateFrom: from, dateTo: to })}
                  />
                </TableHead>
                <TableHead>
                  <ColumnFilter
                    label="REASON"
                    filterLabel="Filter by Reason"
                    value={reasonFilter}
                    onChange={setReasonFilter}
                    options={reasonOptions}
                  />
                </TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <EmptyRow colSpan={5} message="No goods issues found." />
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.giNumber}</TableCell>
                    <TableCell>{new Date(row.giDate).toLocaleDateString()}</TableCell>
                    <TableCell>{row.issueReason}</TableCell>
                    <TableCell className="text-right">{row.itemCount}</TableCell>
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
                <CardTitle className="text-sm">Monthly GI Count</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyTotals}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Issues" fill="#f59e0b" radius={[4, 4, 0, 0]} />
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
  isAdmin,
  shops,
}: TabShellProps) {
  const { data, isLoading } = useShopSummary(filters);
  const rows = data ?? [];
  const shopValue = filters.shopId ?? ALL;

  const handleExport = () => {
    const ok = exportReportCsv('shop-summary-report.csv', rows, [
      { header: 'Shop', value: (r) => r.shopName },
      { header: 'Products', value: (r) => r.totalProducts },
      { header: 'Stock Value', value: (r) => r.totalStockValue },
      { header: 'Low Stock', value: (r) => r.lowStockCount },
      { header: 'Goods Receipts', value: (r) => r.totalGR },
      { header: 'Goods Issues', value: (r) => r.totalGI },
    ] as CsvColumn<(typeof rows)[number]>[]);
    if (ok) toast.success('Report exported.');
    else toast.error('No rows to export.');
  };

  return (
    <div>
      {isAdmin ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <ColumnFilter
            label="SHOP"
            filterLabel="Filter by Shop"
            value={shopValue}
            onChange={(v) => onChange({ shopId: v === ALL ? undefined : v })}
            options={shops.map((s) => ({ value: s.id, label: s.name }))}
          />
          <ReportExportButton onExport={handleExport} disabled={isLoading} />
        </div>
      ) : (
        <div className="mb-3 flex justify-end">
          <ReportExportButton onExport={handleExport} disabled={isLoading} />
        </div>
      )}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="mb-4 h-5 w-32" />
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Store className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>No shop data available.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((shop) => (
            <Card key={shop.shopId}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
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
                  <span className="font-medium text-amber-600">{shop.lowStockCount}</span>
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

export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';

  const [filters, setFilters] = useState<ReportFilters>({});
  const { data: shopsData } = useShops();
  const { categories } = useProductCategories();
  const shops = (shopsData ?? []).map((s) => ({ id: s.id, name: s.name }));

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.name, label: c.name })),
    [categories],
  );

  const updateFilters = useCallback((partial: Partial<ReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const tabProps: TabShellProps = {
    filters,
    onChange: updateFilters,
    isAdmin,
    shops,
    categoryOptions,
  };

  return (
    <AppLayout active="Reports">
      <div className="space-y-6">
        <PageHeader
          title="Reports & Analytics"
          description="Stock registers, movement history, and shop summaries"
        />

        <Tabs defaultValue="low-stock" className="space-y-4">
          <TabsList className="flex h-auto w-full flex-wrap gap-1 overflow-x-auto">
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
            <TabsTrigger value="stock-ledger">Stock Ledger</TabsTrigger>
            <TabsTrigger value="gr-register">GR Register</TabsTrigger>
            <TabsTrigger value="gi-register">GI Register</TabsTrigger>
            <TabsTrigger value="shop-summary">Shop Summary</TabsTrigger>
          </TabsList>

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
