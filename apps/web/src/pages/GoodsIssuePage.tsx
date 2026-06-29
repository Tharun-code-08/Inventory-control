import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDownToLine,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  PackageOpen,
  Plus,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/shared/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DocumentDetailActions } from '@/components/shared/DocumentDetailActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import { useShops } from '@/hooks/use-shops';
import {
  useGoodsIssues,
  useGoodsIssue,
  usePostGoodsIssue,
  useDeleteGoodsIssue,
  type GoodsIssue,
  type GoodsIssueStatus,
} from '@/hooks/use-goods-issues';
import { isAdminUser, isShopOnlyUser, productListShopId } from '@/lib/shop-scope';
import {
  ISSUE_TYPES,
  formatGiDate,
  issueTypeLabel,
  parseGiReference,
} from '@/lib/goods-issue';
import { cn } from '@/lib/cn';
import { csvDate, exportModuleCsv } from '@/lib/module-csv';

const PAGE_SIZE = 10;

function giItemCount(gi: GoodsIssue) {
  return gi.itemCount ?? gi.items?.length ?? 0;
}

type KpiCardProps = {
  label: string;
  value: number;
  accent: string;
  icon: React.ReactNode;
};

function KpiCard({ label, value, accent, icon }: KpiCardProps) {
  return (
    <Card interactive className="group overflow-hidden border-border bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
      <CardContent className="flex items-center gap-3.5 p-4">
        <span className={cn('h-11 w-1.5 shrink-0 rounded-full', accent)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tabular-nums leading-tight tracking-tight text-foreground">{value}</p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-border text-muted-foreground transition-transform duration-300 group-hover:scale-105">
          {icon}
        </span>
      </CardContent>
    </Card>
  );
}

function GiStatusPill({ status }: { status: GoodsIssueStatus }) {
  const posted = status === 'POSTED';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        posted ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-muted text-foreground',
      )}
    >
      {posted ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <FileText className="h-3.5 w-3.5" />
      )}
      {posted ? 'Posted' : 'Draft'}
    </span>
  );
}

export function GoodsIssuePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminUser(user);
  const shopLocked = isShopOnlyUser(user);
  const { data: shops = [] } = useShops();
  const [plantFilter, setPlantFilter] = useState(
    shopLocked && user?.shopId ? user.shopId : 'all',
  );
  const listShopId = productListShopId(user, plantFilter);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: 'post' | 'delete'; id: string } | null>(
    null,
  );

  useEffect(() => {
    if (shopLocked && user?.shopId) {
      setPlantFilter(user.shopId);
    }
  }, [shopLocked, user?.shopId]);

  useEffect(() => {
    const detail = searchParams.get('detail');
    if (detail) {
      setDetailId(detail);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const giQuery = useGoodsIssues({
    shopId: listShopId,
    status: statusFilter !== 'all' ? (statusFilter as GoodsIssueStatus) : undefined,
    take: 300,
  });

  const allRows = giQuery.data ?? [];
  const hasClientFilters = search.trim().length > 0 || typeFilter !== 'all';
  const hasApiFilters =
    statusFilter !== 'all' || (isAdmin && shops.length > 0 && plantFilter !== 'all');

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allRows.filter((gi) => {
      if (typeFilter !== 'all') {
        const label = issueTypeLabel(gi.issueReason);
        if (label !== typeFilter && gi.issueReason !== typeFilter) return false;
      }
      if (!needle) return true;
      return (
        gi.giNumber.toLowerCase().includes(needle) ||
        gi.issueReason.toLowerCase().includes(needle) ||
        (gi.remarks ?? '').toLowerCase().includes(needle) ||
        (gi.shop?.shopName ?? '').toLowerCase().includes(needle)
      );
    });
  }, [allRows, search, typeFilter]);

  const stats = useMemo(() => {
    const total = allRows.length;
    const posted = allRows.filter((g) => g.status === 'POSTED').length;
    return { total, posted };
  }, [allRows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const detailQuery = useGoodsIssue(detailId ?? '');
  const detailGI = detailId ? detailQuery.data : null;
  const postMut = usePostGoodsIssue();
  const deleteMut = useDeleteGoodsIssue();

  const handleExportGiList = () => {
    const ok = exportModuleCsv('goods-issues.csv', filtered, [
      { header: 'GI Number', value: (gi) => gi.giNumber },
      { header: 'Date', value: (gi) => csvDate(gi.giDate) },
      { header: 'Issue Type', value: (gi) => issueTypeLabel(gi.issueReason) },
      { header: 'Other Reason', value: (gi) => gi.otherReason ?? '' },
      { header: 'Reference', value: (gi) => parseGiReference(gi.remarks) },
      { header: 'Plant', value: (gi) => gi.shop?.shopName ?? '' },
      { header: 'Status', value: (gi) => gi.status },
      { header: 'Items', value: (gi) => giItemCount(gi) },
      {
        header: 'Issue Qty',
        value: (gi) => gi.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
      },
      { header: 'Remarks', value: (gi) => gi.remarks ?? '' },
    ]);
    if (ok) toast.success('Goods issues exported');
    else toast.error('No goods issues to export');
  };

  const handleExportGiDetail = (gi: GoodsIssue) => {
    const ok = exportModuleCsv(`${gi.giNumber}.csv`, gi.items.map((item) => ({ gi, item })), [
      { header: 'GI Number', value: ({ gi: current }) => current.giNumber },
      { header: 'Date', value: ({ gi: current }) => csvDate(current.giDate) },
      { header: 'Issue Type', value: ({ gi: current }) => issueTypeLabel(current.issueReason) },
      { header: 'Other Reason', value: ({ gi: current }) => current.otherReason ?? '' },
      { header: 'Reference', value: ({ gi: current }) => parseGiReference(current.remarks) },
      { header: 'Plant', value: ({ gi: current }) => current.shop?.shopName ?? '' },
      { header: 'Status', value: ({ gi: current }) => current.status },
      { header: 'Product Code', value: ({ item }) => item.product?.productCode ?? '' },
      { header: 'Description', value: ({ item }) => item.product?.description ?? '' },
      { header: 'Quantity', value: ({ item }) => item.quantity },
      { header: 'UOM', value: ({ item }) => item.uom },
      { header: 'Available Stock Snapshot', value: ({ item }) => item.availableStockSnapshot },
      { header: 'Remarks', value: ({ gi: current }) => current.remarks ?? '' },
    ]);
    if (ok) toast.success('Goods issue exported');
    else toast.error('No GI lines to export');
  };

  async function handlePost(id: string) {
    try {
      await postMut.mutateAsync(id);
      toast.success('Goods issue posted');
      setDetailId(null);
    } catch {
      toast.error('Failed to post goods issue');
    }
    setConfirmState(null);
  }

  async function handleDelete(id: string) {
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Goods issue deleted');
      setDetailId(null);
    } catch {
      toast.error('Failed to delete goods issue');
    }
    setConfirmState(null);
  }

  return (
    <AppLayout>
      <PageHeader title="Goods Issues" description="Outgoing goods and dispatches">
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button variant="outline" onClick={handleExportGiList} className="w-full sm:w-auto">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => navigate('/goods-issues/new')} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Create GI
          </Button>
        </div>
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <KpiCard
          label={hasClientFilters ? 'Matching Issues (filtered view)' : 'Total Issues'}
          value={hasClientFilters ? filtered.length : stats.total}
          accent="bg-sky-500"
          icon={<ArrowDownToLine className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
        />
        <KpiCard
          label={hasClientFilters ? 'Posted (filtered view)' : 'Posted'}
          value={
            hasClientFilters
              ? filtered.filter((g) => g.status === 'POSTED').length
              : stats.posted
          }
          accent="bg-emerald-500"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        />
      </div>

      <Card className="mb-4 border-border/90 p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by GI number or type"
                className="pl-9"
              />
            </div>
          </div>
          {isAdmin && shops.length > 0 ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Plant</Label>
              <Select
                value={plantFilter}
                onValueChange={(value) => {
                  setPlantFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All plants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plants</SelectItem>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.shopName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Issue Type</Label>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {ISSUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/90 shadow-sm">
        {giQuery.isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : giQuery.isError ? (
          <div className="p-10 text-center text-sm text-destructive">
            Failed to load goods issues.
          </div>
        ) : pageRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <PackageOpen className="mb-3 h-12 w-12 text-slate-300" />
            {allRows.length === 0 ? (
              <>
                <p className="text-sm font-medium text-muted-foreground">No goods issues yet</p>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Saved drafts appear here immediately. Warehouse stock is reduced only when a
                  goods issue is posted.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-muted-foreground">
                  No matches for current filters
                </p>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Try clearing search, status, plant, or issue type filters.
                </p>
              </>
            )}
            {allRows.length === 0 ? (
              <Button variant="outline" className="mt-4" onClick={() => navigate('/goods-issues/new')}>
                <Plus className="h-4 w-4" />
                Create GI
              </Button>
            ) : hasApiFilters || hasClientFilters ? (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  if (isAdmin) setPlantFilter('all');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GI Number</TableHead>
                    <TableHead>Issue Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Plant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((gi) => (
                    <TableRow key={gi.id}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setDetailId(gi.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          {gi.giNumber}
                        </button>
                      </TableCell>
                      <TableCell>
                        {issueTypeLabel(gi.issueReason)}
                        {issueTypeLabel(gi.issueReason) === 'Others' && gi.otherReason ? (
                          <span className="ml-1 text-xs text-muted-foreground">({gi.otherReason})</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {parseGiReference(gi.remarks)}
                      </TableCell>
                      <TableCell>{gi.shop?.shopName ?? '—'}</TableCell>
                      <TableCell>
                        <GiStatusPill status={gi.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded border border-border bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-foreground">
                          {giItemCount(gi)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatGiDate(gi.giDate)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`View ${gi.giNumber}`}
                          onClick={() => setDetailId(gi.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <DialogTitle>{detailGI?.giNumber ?? 'Goods Issue'}</DialogTitle>
                <DialogDescription>Issue details and line items</DialogDescription>
              </div>
              {detailGI ? (
                <Button variant="outline" size="sm" onClick={() => handleExportGiDetail(detailGI)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              ) : null}
            </div>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : detailGI ? (
            <div className="space-y-4">
              <DocumentDetailActions kind="goods-issue" id={detailGI.id} canSend={false} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Issue Type</p>
                  <p className="font-medium">{issueTypeLabel(detailGI.issueReason)}</p>
                </div>
                {issueTypeLabel(detailGI.issueReason) === 'Others' && detailGI.otherReason ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Other Reason</p>
                    <p className="font-medium">{detailGI.otherReason}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs text-muted-foreground">Reference</p>
                  <p className="font-medium">{parseGiReference(detailGI.remarks)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plant</p>
                  <p className="font-medium">{detailGI.shop?.shopName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <GiStatusPill status={detailGI.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{formatGiDate(detailGI.giDate)}</p>
                </div>
              </div>
              {detailGI.remarks && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{detailGI.remarks}</p>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Issue Qty</TableHead>
                    <TableHead>UOM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailGI.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-medium">{item.product?.productCode}</span>
                        <span className="ml-2 text-muted-foreground">{item.product?.description}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                      <TableCell>{item.uom}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {detailGI.status === 'DRAFT' && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmState({ type: 'post', id: detailGI.id })}
                  >
                    Post issue
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setConfirmState({ type: 'delete', id: detailGI.id })}
                  >
                    Delete draft
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmState?.type === 'post'}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title="Post Goods Issue"
        description="Posting will deduct stock for all items. This cannot be undone."
        confirmLabel="Post"
        onConfirm={() => confirmState && handlePost(confirmState.id)}
        loading={postMut.isPending}
      />

      <ConfirmDialog
        open={confirmState?.type === 'delete'}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title="Delete Goods Issue"
        description="Delete this draft goods issue?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => confirmState && handleDelete(confirmState.id)}
        loading={deleteMut.isPending}
      />
    </AppLayout>
  );
}
