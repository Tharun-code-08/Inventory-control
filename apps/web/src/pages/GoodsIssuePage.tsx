import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine,
  CheckCircle2,
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
import {
  useGoodsIssues,
  useGoodsIssue,
  usePostGoodsIssue,
  useDeleteGoodsIssue,
  type GoodsIssue,
  type GoodsIssueStatus,
} from '@/hooks/use-goods-issues';
import { isShopOnlyUser } from '@/lib/shop-scope';
import {
  ISSUE_TYPES,
  formatGiDate,
  issueTypeLabel,
  parseGiReference,
} from '@/lib/goods-issue';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 10;

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
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
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
        posted ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700',
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
  const user = useAuthStore((s) => s.user);
  const shopId = isShopOnlyUser(user) ? user!.shopId! : undefined;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ type: 'post' | 'delete'; id: string } | null>(
    null,
  );

  const giQuery = useGoodsIssues({
    shopId,
    status: statusFilter !== 'all' ? (statusFilter as GoodsIssueStatus) : undefined,
    take: 300,
  });

  const allRows = giQuery.data ?? [];

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
    const total = filtered.length;
    const posted = filtered.filter((g) => g.status === 'POSTED').length;
    return { total, posted };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const detailQuery = useGoodsIssue(detailId ?? '');
  const detailGI = detailId ? detailQuery.data : null;
  const postMut = usePostGoodsIssue();
  const deleteMut = useDeleteGoodsIssue();

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
      <PageHeader
        title="Goods Issues"
        description="Outgoing goods and dispatches"
        action={
          <Button onClick={() => navigate('/goods-issues/new')} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Create GI
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <KpiCard
          label="Total Issues"
          value={stats.total}
          accent="bg-sky-500"
          icon={<ArrowDownToLine className="h-5 w-5 text-sky-600" />}
        />
        <KpiCard
          label="Posted"
          value={stats.posted}
          accent="bg-emerald-500"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      <Card className="mb-4 border-slate-200/90 p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-slate-500">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Status</Label>
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
            <Label className="text-xs text-slate-500">Issue Type</Label>
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

      <Card className="overflow-hidden border-slate-200/90 shadow-sm">
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
            <p className="text-sm font-medium text-slate-600">No goods issues found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/goods-issues/new')}>
              <Plus className="h-4 w-4" />
              Create GI
            </Button>
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
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {gi.giNumber}
                        </button>
                      </TableCell>
                      <TableCell>{issueTypeLabel(gi.issueReason)}</TableCell>
                      <TableCell className="text-slate-600">
                        {parseGiReference(gi.remarks)}
                      </TableCell>
                      <TableCell>{gi.shop?.shopName ?? '—'}</TableCell>
                      <TableCell>
                        <GiStatusPill status={gi.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-700">
                          {gi.items?.length ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600">{formatGiDate(gi.giDate)}</TableCell>
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
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
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
            <DialogTitle>{detailGI?.giNumber ?? 'Goods Issue'}</DialogTitle>
            <DialogDescription>Issue details and line items</DialogDescription>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : detailGI ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Issue Type</p>
                  <p className="font-medium">{issueTypeLabel(detailGI.issueReason)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Reference</p>
                  <p className="font-medium">{parseGiReference(detailGI.remarks)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Plant</p>
                  <p className="font-medium">{detailGI.shop?.shopName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <GiStatusPill status={detailGI.status} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="font-medium">{formatGiDate(detailGI.giDate)}</p>
                </div>
              </div>
              {detailGI.remarks && (
                <div>
                  <p className="text-xs text-slate-500">Notes</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{detailGI.remarks}</p>
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
                        <span className="ml-2 text-slate-500">{item.product?.description}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                      <TableCell>{item.uom}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {detailGI.status === 'DRAFT' && (
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
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
