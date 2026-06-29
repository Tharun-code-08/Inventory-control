import { useMemo, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ShoppingCart, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFastMovingReport } from '@/hooks/use-reports';
import type { DashboardViewData } from '@/lib/dashboard-demo-data';
import { EMPTY_DASHBOARD } from '@/lib/dashboard-demo-data';
import { cn } from '@/lib/cn';

type InsightTileProps = {
  label: string;
  value: number;
  hint: string;
  icon: ElementType;
  iconClassName: string;
  iconWrapClassName: string;
  onClick: () => void;
};

function InsightTile({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName,
  iconWrapClassName,
  onClick,
}: InsightTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'motion-kpi-card flex w-full flex-col rounded-xl border border-border bg-card p-4 text-left shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      )}
      aria-label={`${label}: ${value}. ${hint}`}
    >
      <div className="flex items-center gap-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconWrapClassName)}>
          <Icon className={cn('h-4 w-4', iconClassName)} aria-hidden />
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </button>
  );
}

function FastMovingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

type DashboardInsightsPanelProps = {
  dashboard?: DashboardViewData;
  shopId?: string;
  isLoading?: boolean;
};

export function DashboardInsightsPanel({
  dashboard,
  shopId,
  isLoading = false,
}: DashboardInsightsPanelProps) {
  const navigate = useNavigate();
  const ctx = dashboard?.kpiContext ?? EMPTY_DASHBOARD.kpiContext;

  const fastMovingRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return {
      dateFrom: from.toISOString().slice(0, 10),
      dateTo: to.toISOString().slice(0, 10),
    };
  }, []);

  const { data: fastMovingRaw = [], isLoading: fastMovingLoading } = useFastMovingReport(
    {
      shopId,
      dateFrom: fastMovingRange.dateFrom,
      dateTo: fastMovingRange.dateTo,
      limit: 5,
    },
    { enabled: !!shopId },
  );

  const fastMovingRows = useMemo(() => {
    if (!Array.isArray(fastMovingRaw)) return [];
    return fastMovingRaw.slice(0, 5).map((row: Record<string, unknown>) => ({
      productCode: String(row.product_code ?? row.productCode ?? ''),
      description: String(row.description ?? ''),
      issuedQty: Number(row.total_issued_qty ?? row.totalIssuedQty ?? 0),
    }));
  }, [fastMovingRaw]);

  return (
    <section aria-label="Operational insights" className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Operational Insights</h2>
        <p className="text-xs text-muted-foreground">
          Pending orders and movement highlights for your selected scope.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {isLoading ? (
          <>
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl lg:col-span-1" />
          </>
        ) : (
          <>
            <InsightTile
              label="Pending Purchase Orders"
              value={ctx.pendingPurchaseOrders}
              hint="Confirmed POs awaiting receipt"
              icon={ClipboardList}
              iconClassName="text-blue-600 dark:text-blue-400"
              iconWrapClassName="bg-blue-500/15 border border-blue-400/20"
              onClick={() => navigate('/purchase-orders')}
            />
            <InsightTile
              label="Pending Sales Orders"
              value={ctx.pendingSalesOrders}
              hint="Confirmed orders not yet fulfilled"
              icon={ShoppingCart}
              iconClassName="text-violet-600 dark:text-violet-400"
              iconWrapClassName="bg-violet-500/15 border border-violet-400/20"
              onClick={() => navigate('/sales')}
            />
            <Card className="surface-1 lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Top Fast-Moving Products
                </CardTitle>
                <p className="text-xs font-normal text-muted-foreground">
                  Highest issue volume in the last 30 days.
                </p>
              </CardHeader>
              <CardContent>
                {!shopId ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Select a single plant to see fast-moving products.
                  </p>
                ) : fastMovingLoading ? (
                  <FastMovingSkeleton />
                ) : fastMovingRows.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No goods issues recorded in the last 30 days.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Issued</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fastMovingRows.map((row) => (
                        <TableRow key={row.productCode}>
                          <TableCell className="font-medium">{row.productCode}</TableCell>
                          <TableCell className="max-w-[140px] truncate">{row.description}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.issuedQty}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </section>
  );
}
