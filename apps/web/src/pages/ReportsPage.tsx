import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle,
  ClipboardList,
  Download,
  DollarSign,
  FileText,
  Package,
  ShoppingCart,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ColumnFilter } from '@/components/shared/column-filter';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  useLowStockReport,
  useStockLedger,
  useGrRegister,
  useGiRegister,
  useShopSummary,
  useReportsOverview,
  usePoSummary,
  useSalesSummary,
  useExecutiveSummary,
  useInventoryAging,
  useRfqSummary,
  useSavedFilters,
  useCreateSavedFilter,
  useDeleteSavedFilter,
  reportKeys,
  type ReportFilters,
} from '@/hooks/use-reports';
import { useShops } from '@/hooks/use-shops';
import { useProductCategories } from '@/hooks/use-product-categories';
import { useProducts } from '@/hooks/use-products';
import { useAuthStore } from '@/store/authStore';
import { isOrgAdminUser } from '@/lib/roles';
import { AppLayout } from '@/components/AppLayout';
import { exportReportCsv } from '@/lib/report-csv-export';
import type { CsvColumn } from '@/lib/csv';
import { ReportsPageHeader } from '@/components/reports/ReportsPageHeader';
import { ReportsDateRangeBar, type ReportsDatePreset } from '@/components/reports/ReportsDateRangeBar';
import { ReportsBreadcrumb } from '@/components/reports/ReportsBreadcrumb';
import { ReportsGlobalKpiStrip, type ReportsKpiItem } from '@/components/reports/ReportsGlobalKpiStrip';
import { ReportsSavedFiltersBar } from '@/components/reports/ReportsSavedFiltersBar';
import { computePeriodTrend } from '@/lib/kpi-trend';

const ALL = '_all';

const REPORT_TABS = [
  'executive-summary',
  'purchase-orders',
  'sales-orders',
  'low-stock',
  'stock-ledger',
  'gr-register',
  'gi-register',
  'shop-summary',
  'inventory-aging',
  'rfq-analytics',
] as const;

type ReportTab = (typeof REPORT_TABS)[number];

function isReportTab(value: string | null): value is ReportTab {
  return REPORT_TABS.includes(value as ReportTab);
}

const REPORT_LABELS: Record<ReportTab, string> = {
  'executive-summary': 'Executive Summary',
  'purchase-orders': 'PO Reports',
  'sales-orders': 'Sales Reports',
  'low-stock': 'Low Stock',
  'stock-ledger': 'Stock Ledger',
  'gr-register': 'GR Register',
  'gi-register': 'GI Register',
  'shop-summary': 'Shop Summary',
  'inventory-aging': 'Inventory Aging',
  'rfq-analytics': 'RFQ Analytics',
};

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultDateRange() {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { dateFrom: formatDateInput(start), dateTo: formatDateInput(end) };
}

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

function TabKpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="surface-2">
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
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

function ExecutiveSummaryTab({ filters }: Pick<TabShellProps, 'filters'>) {
  const { data, isLoading } = useExecutiveSummary(filters);
  const kpis = Array.isArray(data?.kpis) ? data.kpis : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
          : kpis.map((kpi: any) => {
              const trend = kpi.priorValue != null ? computePeriodTrend(kpi.value, kpi.priorValue) : undefined;
              return (
                <Card key={kpi.key} className="surface-2">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {kpi.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {typeof kpi.value === 'number' ? kpi.value.toLocaleString('en-IN') : kpi.value}
                    </p>
                    {trend ? (
                      <p className="mt-1 text-xs text-muted-foreground">{trend.label}</p>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="surface-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : data?.alerts?.length ? (
              <div className="space-y-3 text-sm">
                {data.alerts.map((alert: any) => (
                  <div key={alert.label} className="flex items-center justify-between">
                    <span className="capitalize">{alert.label}</span>
                    <span className="font-medium">{alert.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No alerts for the selected period.</p>
            )}
          </CardContent>
        </Card>

        <Card className="surface-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Negative stock items</span>
              <span className="font-medium">{data?.systemHealth?.negativeStockCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Failed emails (7d)</span>
              <span className="font-medium">{data?.systemHealth?.failedEmailCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending outbox events</span>
              <span className="font-medium">{data?.systemHealth?.pendingOutboxCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Draft POs {'>'} 30d</span>
              <span className="font-medium">{data?.systemHealth?.staleDraftCount ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="surface-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Top Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.rankings?.topSuppliers?.length ? (
              <div className="space-y-2 text-sm">
                {data.rankings.topSuppliers.map((row: any) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span>{row.label}</span>
                    <span className="font-medium">₹{Number(row.value ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No supplier data yet.</p>
            )}
          </CardContent>
        </Card>
        <Card className="surface-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.rankings?.topCustomers?.length ? (
              <div className="space-y-2 text-sm">
                {data.rankings.topCustomers.map((row: any) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span>{row.label}</span>
                    <span className="font-medium">₹{Number(row.value ?? 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No customer data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PurchaseOrdersTab({ filters, onChange }: Pick<TabShellProps, 'filters' | 'onChange'>) {
  const { data, isLoading } = usePoSummary(filters);
  const rows = (Array.isArray(data?.rows) ? data.rows : []) as Array<{
    poNumber: string;
    poDate: string;
    supplier: string;
    status: string;
    totalValue: number;
  }>;
  const kpis = data?.kpis ?? {};
  const statusValue = filters.poStatus ?? ALL;

  const handleExport = () => {
    const ok = exportReportCsv('po-report.csv', rows, [
      { header: 'PO Number', value: (r) => r.poNumber },
      { header: 'Date', value: (r) => new Date(r.poDate).toLocaleDateString() },
      { header: 'Supplier', value: (r) => r.supplier },
      { header: 'Status', value: (r) => r.status },
      { header: 'Total Value', value: (r) => r.totalValue },
    ]);
    if (ok) toast.success('Report exported.');
    else toast.error('No rows to export.');
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TabKpiCard label="Total POs" value={Number(kpis.totalCount ?? 0).toLocaleString('en-IN')} />
        <TabKpiCard label="PO Value" value={`₹${Number(kpis.totalValue ?? 0).toLocaleString('en-IN')}`} />
        <TabKpiCard label="Confirmed" value={Number(kpis.confirmedCount ?? 0).toLocaleString('en-IN')} />
        <TabKpiCard label="Cancelled" value={Number(kpis.cancelledCount ?? 0).toLocaleString('en-IN')} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-9 w-[180px]"
            placeholder="PO Number"
            value={filters.poNumber ?? ''}
            onChange={(e) => onChange({ poNumber: e.target.value || undefined })}
          />
          <Input
            className="h-9 w-[180px]"
            placeholder="Supplier"
            value={filters.supplier ?? ''}
            onChange={(e) => onChange({ supplier: e.target.value || undefined })}
          />
          <ColumnFilter
            label="STATUS"
            filterLabel="Filter by Status"
            value={statusValue}
            onChange={(v) => onChange({ poStatus: v === ALL ? undefined : v })}
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>
        <ReportExportButton onExport={handleExport} disabled={isLoading} />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={5} message="No purchase orders found." />
            ) : (
              rows.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.poNumber}</TableCell>
                  <TableCell>{new Date(row.poDate).toLocaleDateString()}</TableCell>
                  <TableCell>{row.supplier}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right">₹{Number(row.totalValue ?? 0).toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function SalesOrdersTab({ filters, onChange }: Pick<TabShellProps, 'filters' | 'onChange'>) {
  const { data, isLoading } = useSalesSummary(filters);
  const rows = (Array.isArray(data?.rows) ? data.rows : []) as Array<{
    orderNumber: string;
    orderDate: string;
    customer: string;
    status: string;
    totalValue: number;
  }>;
  const kpis = data?.kpis ?? {};
  const statusValue = filters.salesStatus ?? ALL;

  const handleExport = () => {
    const ok = exportReportCsv('sales-report.csv', rows, [
      { header: 'Order Number', value: (r) => r.orderNumber },
      { header: 'Date', value: (r) => new Date(r.orderDate).toLocaleDateString() },
      { header: 'Customer', value: (r) => r.customer },
      { header: 'Status', value: (r) => r.status },
      { header: 'Total Value', value: (r) => r.totalValue },
    ]);
    if (ok) toast.success('Report exported.');
    else toast.error('No rows to export.');
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TabKpiCard label="Total Orders" value={Number(kpis.totalCount ?? 0).toLocaleString('en-IN')} />
        <TabKpiCard label="Sales Value" value={`₹${Number(kpis.totalValue ?? 0).toLocaleString('en-IN')}`} />
        <TabKpiCard label="Confirmed" value={Number(kpis.confirmedCount ?? 0).toLocaleString('en-IN')} />
        <TabKpiCard label="Fulfilled" value={Number(kpis.fulfilledCount ?? 0).toLocaleString('en-IN')} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-9 w-[180px]"
            placeholder="Order Number"
            value={filters.orderNumber ?? ''}
            onChange={(e) => onChange({ orderNumber: e.target.value || undefined })}
          />
          <Input
            className="h-9 w-[180px]"
            placeholder="Customer"
            value={filters.customer ?? ''}
            onChange={(e) => onChange({ customer: e.target.value || undefined })}
          />
          <ColumnFilter
            label="STATUS"
            filterLabel="Filter by Status"
            value={statusValue}
            onChange={(v) => onChange({ salesStatus: v === ALL ? undefined : v })}
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'FULFILLED', label: 'Fulfilled' },
              { value: 'CLOSED', label: 'Closed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>
        <ReportExportButton onExport={handleExport} disabled={isLoading} />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={5} message="No sales orders found." />
            ) : (
              rows.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.orderNumber}</TableCell>
                  <TableCell>{new Date(row.orderDate).toLocaleDateString()}</TableCell>
                  <TableCell>{row.customer}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right">₹{Number(row.totalValue ?? 0).toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function InventoryAgingTab({ filters, onChange }: Pick<TabShellProps, 'filters' | 'onChange'>) {
  const { data, isLoading } = useInventoryAging(filters);
  const buckets = Array.isArray(data?.buckets) ? data.buckets : [];
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const bucketValue = filters.agingBucket ?? ALL;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ColumnFilter
          label="BUCKET"
          filterLabel="Filter by Aging Bucket"
          value={bucketValue}
          onChange={(v) => onChange({ agingBucket: v === ALL ? undefined : v })}
          options={[
            { value: '0-30', label: '0–30 Days' },
            { value: '31-60', label: '31–60 Days' },
            { value: '61-90', label: '61–90 Days' },
            { value: '90+', label: '90+ Days' },
          ]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {buckets.map((bucket: any) => (
          <TabKpiCard
            key={bucket.bucket}
            label={`${bucket.bucket} Days`}
            value={`₹${Number(bucket.totalValue ?? 0).toLocaleString('en-IN')}`}
          />
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Age (Days)</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={5} message="Select a bucket to view items." />
            ) : (
              rows.map((row: any) => (
                <TableRow key={`${row.productCode}-${row.shopId}`}>
                  <TableCell>
                    <div className="font-medium">{row.productCode}</div>
                    <div className="text-xs text-muted-foreground">{row.description}</div>
                  </TableCell>
                  <TableCell>{row.shopId}</TableCell>
                  <TableCell className="text-right">{row.currentStock}</TableCell>
                  <TableCell className="text-right">{row.ageDays}</TableCell>
                  <TableCell className="text-right">₹{Number(row.stockValue ?? 0).toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function RfqAnalyticsTab({ filters }: Pick<TabShellProps, 'filters'>) {
  const { data, isLoading } = useRfqSummary(filters);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
      ) : (
        <>
          <TabKpiCard label="RFQ Created" value={Number(data?.createdCount ?? 0).toLocaleString('en-IN')} />
          <TabKpiCard label="RFQ Posted" value={Number(data?.postedCount ?? 0).toLocaleString('en-IN')} />
          <TabKpiCard label="RFQ Awarded" value={Number(data?.awardedCount ?? 0).toLocaleString('en-IN')} />
          <TabKpiCard label="Conversion %" value={`${Number(data?.conversionPct ?? 0).toFixed(1)}%`} />
          <TabKpiCard label="Avg Cycle (Days)" value={Number(data?.avgCycleDays ?? 0).toFixed(1)} />
        </>
      )}
    </div>
  );
}

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
        <div className="flex flex-wrap items-center gap-1">
          {isAdmin ? (
            <ColumnFilter
              label="SHOP"
              filterLabel="Filter by Shop"
              value={shopValue}
              onChange={(v) => onChange({ shopId: v === ALL ? undefined : v })}
              options={shops.map((s) => ({ value: s.id, label: s.name }))}
            />
          ) : null}
          <ColumnFilter
            label="CATEGORY"
            filterLabel="Filter by Category"
            value={categoryValue}
            onChange={(v) => onChange({ category: v === ALL ? undefined : v })}
            options={categoryOptions}
          />
        </div>
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
        <div className="flex flex-wrap items-center gap-1">
          {isAdmin ? (
            <ColumnFilter
              label="SHOP"
              filterLabel="Filter by Shop"
              value={shopValue}
              onChange={(v) => onChange({ shopId: v === ALL ? undefined : v })}
              options={shops.map((s) => ({ value: s.id, label: s.name }))}
            />
          ) : null}
          <ColumnFilter
            label="PRODUCT"
            filterLabel="Filter by Product"
            value={productFilter}
            onChange={setProductFilter}
            options={productOptions}
          />
        </div>
        <ReportExportButton onExport={handleExport} disabled={isLoading} />
      </div>
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
                  <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="font-medium">{row.productCode}</div>
                    <div className="text-xs text-muted-foreground">{row.description}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.type} />
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                    {row.inQty > 0 ? `+${row.inQty}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
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
  categoryOptions,
}: TabShellProps) {
  const { data, isLoading } = useGrRegister(filters);
  const rows = data ?? [];
  const { data: productList } = useProducts({
    limit: 200,
    shopId: filters.shopId,
    companyCatalog: true,
  });
  const productOptions = useMemo(
    () =>
      (productList?.items ?? productList?.data ?? []).map((p) => ({
        value: p.id,
        label: `${p.productCode} — ${p.description}`,
      })),
    [productList],
  );

  const statusValue = filters.grStatus ?? ALL;
  const categoryValue = filters.category ?? ALL;
  const productValue = filters.productId ?? ALL;

  const shopValue = filters.shopId ?? ALL;

  const handleExport = () => {
    const ok = exportReportCsv('gr-register-report.csv', rows, [
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
        <div className="flex flex-wrap items-center gap-1">
          {isAdmin ? (
            <ColumnFilter
              label="SHOP"
              filterLabel="Filter by Shop"
              value={shopValue}
              onChange={(v) => onChange({ shopId: v === ALL ? undefined : v })}
              options={shops.map((s) => ({ value: s.id, label: s.name }))}
            />
          ) : null}
          <Input
            className="h-9 w-[170px]"
            placeholder="GR Number"
            value={filters.grNumber ?? ''}
            onChange={(e) => onChange({ grNumber: e.target.value || undefined })}
          />
          <ColumnFilter
            label="PRODUCT"
            filterLabel="Filter by Product"
            value={productValue}
            onChange={(v) => onChange({ productId: v === ALL ? undefined : v })}
            options={productOptions}
          />
          <ColumnFilter
            label="CATEGORY"
            filterLabel="Filter by Category"
            value={categoryValue}
            onChange={(v) => onChange({ category: v === ALL ? undefined : v })}
            options={categoryOptions}
          />
          <ColumnFilter
            label="STATUS"
            filterLabel="Filter by Status"
            value={statusValue}
            onChange={(v) => onChange({ grStatus: v === ALL ? undefined : v })}
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'POSTED', label: 'Posted' },
            ]}
          />
        </div>
        <ReportExportButton onExport={handleExport} disabled={isLoading} />
      </div>
      {isLoading ? (
        <TableSkeleton />
      ) : (
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
                  <TableCell className="font-medium">{row.grNumber}</TableCell>
                  <TableCell>{new Date(row.grDate).toLocaleDateString()}</TableCell>
                  <TableCell>{row.supplier}</TableCell>
                  <TableCell className="text-right">{row.itemCount}</TableCell>
                  <TableCell className="text-right">₹{row.totalValue?.toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
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
        <div className="flex flex-wrap items-center gap-1">
          {isAdmin ? (
            <ColumnFilter
              label="SHOP"
              filterLabel="Filter by Shop"
              value={shopValue}
              onChange={(v) => onChange({ shopId: v === ALL ? undefined : v })}
              options={shops.map((s) => ({ value: s.id, label: s.name }))}
            />
          ) : null}
          <ColumnFilter
            label="REASON"
            filterLabel="Filter by Reason"
            value={reasonFilter}
            onChange={setReasonFilter}
            options={reasonOptions}
          />
        </div>
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
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
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
      { header: 'Sales Value', value: (r) => r.salesValue },
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
                  <span className="font-medium text-amber-600 dark:text-amber-400">{shop.lowStockCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Goods Receipts</span>
                  <span className="font-medium">{shop.totalGR}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Goods Issues</span>
                  <span className="font-medium">{shop.totalGI}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sales Value</span>
                  <span className="font-medium">₹{shop.salesValue?.toLocaleString()}</span>
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
  const isAdmin = isOrgAdminUser(user);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: ReportTab = isReportTab(tabParam) ? tabParam : 'executive-summary';
  const shopIdParam = searchParams.get('shopId') ?? undefined;

  const [datePreset, setDatePreset] = useState<ReportsDatePreset>('30d');
  const [filters, setFilters] = useState<ReportFilters>(() => ({
    ...(shopIdParam ? { shopId: shopIdParam } : {}),
    ...defaultDateRange(),
  }));
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: shopsData } = useShops();
  const { categories } = useProductCategories();
  const shops = (shopsData ?? []).map((s) => ({ id: s.id, name: s.shopName }));

  const { data: overview, isLoading: overviewLoading } = useReportsOverview(filters);
  const { data: savedFilters = [] } = useSavedFilters(activeTab);
  const createSavedFilter = useCreateSavedFilter();
  const deleteSavedFilter = useDeleteSavedFilter();
  const [selectedFilterId, setSelectedFilterId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (shopIdParam) {
      setFilters((prev) => (prev.shopId === shopIdParam ? prev : { ...prev, shopId: shopIdParam }));
    }
  }, [shopIdParam]);

  useEffect(() => {
    if (overview) {
      setLastUpdated(new Date());
    }
  }, [overview]);

  useEffect(() => {
    setSelectedFilterId(undefined);
  }, [activeTab]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.name, label: c.name })),
    [categories],
  );

  const updateFilters = useCallback((partial: Partial<ReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handlePresetChange = useCallback(
    (preset: ReportsDatePreset, range: { from?: string; to?: string }) => {
      setDatePreset(preset);
      updateFilters({ dateFrom: range.from, dateTo: range.to });
    },
    [updateFilters],
  );

  const handleCustomChange = useCallback(
    (from?: string, to?: string) => {
      setDatePreset('custom');
      updateFilters({ dateFrom: from, dateTo: to });
    },
    [updateFilters],
  );

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: reportKeys.all });
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, [isRefreshing, queryClient]);

  const handleTabChange = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', value);
        return next;
      });
    },
    [setSearchParams],
  );

  const reportFilterPayload = useMemo(() => {
    const prune = (payload: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined && value !== ''),
      );
    switch (activeTab) {
      case 'purchase-orders':
        return prune({
          shopId: filters.shopId,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          poNumber: filters.poNumber,
          supplier: filters.supplier,
          poStatus: filters.poStatus,
        });
      case 'sales-orders':
        return prune({
          shopId: filters.shopId,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          orderNumber: filters.orderNumber,
          customer: filters.customer,
          salesStatus: filters.salesStatus,
        });
      case 'gr-register':
        return prune({
          shopId: filters.shopId,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          grNumber: filters.grNumber,
          grStatus: filters.grStatus,
          productId: filters.productId,
          category: filters.category,
        });
      case 'inventory-aging':
        return prune({
          shopId: filters.shopId,
          agingBucket: filters.agingBucket,
        });
      default:
        return prune({
          shopId: filters.shopId,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          category: filters.category,
        });
    }
  }, [activeTab, filters]);

  const handleSaveFilter = useCallback(() => {
    const name = window.prompt('Save current filters as');
    if (!name) return;
    createSavedFilter.mutate(
      { reportType: activeTab, name, filterJson: reportFilterPayload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: reportKeys.savedFilters(activeTab) });
        },
      },
    );
  }, [activeTab, createSavedFilter, queryClient, reportFilterPayload]);

  const handleDeleteFilter = useCallback(
    (id: string) => {
      deleteSavedFilter.mutate(id, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: reportKeys.savedFilters(activeTab) });
          setSelectedFilterId(undefined);
        },
      });
    },
    [activeTab, deleteSavedFilter, queryClient],
  );

  const handleSelectSavedFilter = useCallback(
    (filter: { id: string; filterJson: Record<string, unknown> } | null) => {
      if (!filter) {
        setSelectedFilterId(undefined);
        return;
      }
      setSelectedFilterId(filter.id);
      const payload = (filter.filterJson ?? {}) as Partial<ReportFilters>;
      setFilters((prev) => ({ ...prev, ...payload }));
      if ('dateFrom' in payload || 'dateTo' in payload) {
        setDatePreset('custom');
      }
    },
    [],
  );

  const tabProps: TabShellProps = {
    filters,
    onChange: updateFilters,
    isAdmin,
    shops,
    categoryOptions,
  };

  const kpiItems: ReportsKpiItem[] = useMemo(() => {
    const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`;
    return [
      {
        key: 'stock-value',
        label: 'Stock Value',
        numericValue: Number(overview?.stockValue ?? 0),
        format: formatCurrency,
        icon: DollarSign,
        accent: 'emerald' as const,
        ariaLabel: `Stock value ${formatCurrency(Number(overview?.stockValue ?? 0))}`,
        onClick: () => handleTabChange('shop-summary'),
      },
      {
        key: 'low-stock',
        label: 'Low Stock',
        numericValue: Number(overview?.lowStockCount ?? 0),
        icon: AlertTriangle,
        accent: 'amber' as const,
        ariaLabel: `Low stock count ${Number(overview?.lowStockCount ?? 0)}`,
        onClick: () => handleTabChange('low-stock'),
      },
      {
        key: 'po-value',
        label: 'PO Value',
        numericValue: Number(overview?.poValue ?? 0),
        format: formatCurrency,
        icon: FileText,
        accent: 'sky' as const,
        ariaLabel: `PO value ${formatCurrency(Number(overview?.poValue ?? 0))}`,
        onClick: () => handleTabChange('purchase-orders'),
      },
      {
        key: 'sales-value',
        label: 'Sales Value',
        numericValue: Number(overview?.salesValue ?? 0),
        format: formatCurrency,
        icon: ShoppingCart,
        accent: 'violet' as const,
        ariaLabel: `Sales value ${formatCurrency(Number(overview?.salesValue ?? 0))}`,
        onClick: () => handleTabChange('sales-orders'),
      },
      {
        key: 'gr-count',
        label: 'GR Count',
        numericValue: Number(overview?.grCount ?? 0),
        icon: Package,
        accent: 'indigo' as const,
        ariaLabel: `GR count ${Number(overview?.grCount ?? 0)}`,
        onClick: () => handleTabChange('gr-register'),
      },
      {
        key: 'sales-orders',
        label: 'Sales Orders',
        numericValue: Number(overview?.salesOrderCount ?? 0),
        icon: ClipboardList,
        accent: 'rose' as const,
        ariaLabel: `Sales orders ${Number(overview?.salesOrderCount ?? 0)}`,
        onClick: () => handleTabChange('sales-orders'),
      },
    ];
  }, [overview, handleTabChange]);

  return (
    <AppLayout active="Reports">
      <div className="space-y-6">
        <ReportsPageHeader
          title="Reports & Analytics"
          description="Stock registers, procurement, and sales visibility."
          lastUpdated={lastUpdated}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        <ReportsDateRangeBar
          preset={datePreset}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onPresetChange={handlePresetChange}
          onCustomChange={handleCustomChange}
        />

        <ReportsBreadcrumb items={['Reports', REPORT_LABELS[activeTab]]} />

        <ReportsGlobalKpiStrip isLoading={overviewLoading} items={kpiItems} />

        <ReportsSavedFiltersBar
          filters={savedFilters}
          selectedId={selectedFilterId}
          onSelect={handleSelectSavedFilter}
          onSave={handleSaveFilter}
          onDelete={handleDeleteFilter}
          isSaving={createSavedFilter.isPending}
          isDeleting={deleteSavedFilter.isPending}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="flex h-auto w-full flex-wrap gap-1 overflow-x-auto">
            <TabsTrigger value="executive-summary">Executive Summary</TabsTrigger>
            <TabsTrigger value="purchase-orders">PO Reports</TabsTrigger>
            <TabsTrigger value="sales-orders">Sales Reports</TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
            <TabsTrigger value="stock-ledger">Stock Ledger</TabsTrigger>
            <TabsTrigger value="gr-register">GR Register</TabsTrigger>
            <TabsTrigger value="gi-register">GI Register</TabsTrigger>
            <TabsTrigger value="shop-summary">Shop Summary</TabsTrigger>
            <TabsTrigger value="inventory-aging">Inventory Aging</TabsTrigger>
            <TabsTrigger value="rfq-analytics">RFQ Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="executive-summary">
            <ExecutiveSummaryTab filters={filters} />
          </TabsContent>

          <TabsContent value="purchase-orders">
            <Card>
              <CardContent className="pt-6">
                <PurchaseOrdersTab filters={filters} onChange={updateFilters} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales-orders">
            <Card>
              <CardContent className="pt-6">
                <SalesOrdersTab filters={filters} onChange={updateFilters} />
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

          <TabsContent value="inventory-aging">
            <Card>
              <CardContent className="pt-6">
                <InventoryAgingTab filters={filters} onChange={updateFilters} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rfq-analytics">
            <Card>
              <CardContent className="pt-6">
                <RfqAnalyticsTab filters={filters} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
