import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, ExternalLink, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader, KpiCard, EmptyState, LoadingSkeleton } from '@/components/shared';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  useApprovals,
  useApprovalStats,
  useApproveApproval,
  useRejectApproval,
  approvalDeepLink,
  type ApprovalRequest,
  type ApprovalStatus,
} from '@/hooks/use-approvals';

const TABS: { key: ApprovalStatus; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

function formatAmount(amount?: number | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatType(type: string): string {
  return (type || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ApprovalsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ApprovalStatus>('PENDING');
  const { data: feed, isLoading } = useApprovals({ status: tab });
  const { data: stats } = useApprovalStats();
  const approve = useApproveApproval();
  const reject = useRejectApproval();

  const [active, setActive] = useState<ApprovalRequest | null>(null);
  const [decisionComment, setDecisionComment] = useState('');

  const rows = feed?.data ?? [];
  const deepLink = useMemo(() => (active ? approvalDeepLink(active) : null), [active]);

  function openDetail(a: ApprovalRequest) {
    setActive(a);
    setDecisionComment('');
  }

  async function handleApprove() {
    if (!active) return;
    try {
      await approve.mutateAsync({ id: active.id, comment: decisionComment.trim() || undefined });
      toast.success(`Approved ${active.documentNumber ?? formatType(active.approvalType)}`);
      setActive(null);
    } catch {
      toast.error('Could not approve. Please try again.');
    }
  }

  async function handleReject() {
    if (!active) return;
    const reason = decisionComment.trim();
    if (!reason) {
      toast.error('A rejection reason is required.');
      return;
    }
    try {
      await reject.mutateAsync({ id: active.id, rejectionReason: reason });
      toast.success(`Rejected ${active.documentNumber ?? formatType(active.approvalType)}`);
      setActive(null);
    } catch {
      toast.error('Could not reject. Please try again.');
    }
  }

  return (
    <AppLayout active="Approvals">
      <PageHeader title="Pending Approvals" description="Review and action documents awaiting your decision." />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Pending" value={stats?.pending ?? 0} accent="bg-amber-500" icon={<Clock className="h-5 w-5" />} />
        <KpiCard label="Approved" value={stats?.approved ?? 0} accent="bg-emerald-500" icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard label="Rejected" value={stats?.rejected ?? 0} accent="bg-red-500" icon={<XCircle className="h-5 w-5" />} />
      </div>

      <div className="mb-3 flex gap-1 rounded-xl border border-border bg-card p-1 dark:border-slate-800 dark:bg-slate-900 sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ' +
              (tab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted dark:text-muted-foreground dark:hover:bg-slate-800')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <LoadingSkeleton />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title={`No ${tab.toLowerCase()} approvals`}
              description={
                tab === 'PENDING'
                  ? "You're all caught up — nothing is waiting on you."
                  : `There are no ${tab.toLowerCase()} approval requests yet.`
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Required by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => openDetail(a)}>
                    <TableCell className="font-medium">{a.documentNumber ?? '—'}</TableCell>
                    <TableCell>{formatType(a.approvalType)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAmount(a.amount)}</TableCell>
                    <TableCell>{formatDate(a.requiredAt)}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(a);
                        }}
                      >
                        {a.status === 'PENDING' ? 'Review' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{active?.documentNumber ?? 'Approval request'}</SheetTitle>
            <SheetDescription>{active && formatType(active.approvalType)}</SheetDescription>
          </SheetHeader>

          {active && (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd><StatusBadge status={active.status} /></dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="font-medium tabular-nums">{formatAmount(active.amount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Required by</dt>
                  <dd>{formatDate(active.requiredAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Requested</dt>
                  <dd>{formatDate(active.createdAt)}</dd>
                </div>
                {active.description && (
                  <div>
                    <dt className="mb-1 text-muted-foreground">Description</dt>
                    <dd className="rounded-lg bg-muted p-3 text-foreground">{active.description}</dd>
                  </div>
                )}
                {active.status === 'REJECTED' && active.rejectionReason && (
                  <div>
                    <dt className="mb-1 text-muted-foreground">Rejection reason</dt>
                    <dd className="rounded-lg bg-red-50 dark:bg-red-500/10 p-3 text-red-700 dark:text-red-300 dark:bg-red-950/40 dark:text-red-300">
                      {active.rejectionReason}
                    </dd>
                  </div>
                )}
              </dl>

              {deepLink && (
                <Button variant="outline" className="w-full" onClick={() => navigate(deepLink)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View document
                </Button>
              )}

              {active.status === 'PENDING' && (
                <div className="mt-auto space-y-3 border-t border-border pt-4 dark:border-slate-800">
                  <Textarea
                    placeholder="Add a comment (required to reject)…"
                    value={decisionComment}
                    onChange={(e) => setDecisionComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
                      onClick={handleReject}
                      disabled={reject.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button className="flex-1" onClick={handleApprove} disabled={approve.isPending}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
