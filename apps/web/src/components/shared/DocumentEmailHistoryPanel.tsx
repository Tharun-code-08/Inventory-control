import { Mail, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import type { DocumentEmailHistoryRow, DocumentEmailSummary } from '@/hooks/use-document-email-history';

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'sent' || s === 'delivered') return 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
  if (s === 'pending_pdf' || s === 'pending_send') return 'bg-amber-100 dark:bg-amber-500/15 text-amber-900 border-amber-200 dark:border-amber-500/30';
  if (s === 'failed') return 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300 border-red-200 dark:border-red-500/30';
  return 'bg-muted text-foreground border-border';
}

type DocumentEmailHistoryPanelProps = {
  summary?: DocumentEmailSummary | null;
  history?: DocumentEmailHistoryRow[];
  isLoading?: boolean;
  className?: string;
};

export function DocumentEmailHistoryPanel({
  summary,
  history,
  isLoading,
  className,
}: DocumentEmailHistoryPanelProps) {
  const rows = history ?? [];

  if (isLoading) {
    return (
      <Card className={cn('border-border/80', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const latest = summary;
  const hasHistory = rows.length > 0;

  if (!latest && !hasHistory) {
    return (
      <Card className={cn('border-border/80', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email history
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No emails sent for this document yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-border/80', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Email history
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {latest && (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Email status</dt>
              <dd className="mt-0.5">
                <Badge variant="outline" className={cn('border', statusBadgeClass(latest.emailStatus))}>
                  {statusLabel(latest.emailStatus)}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sent to</dt>
              <dd className="mt-0.5 font-medium">{latest.lastRecipient ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sent at</dt>
              <dd className="mt-0.5">{formatDateTime(latest.lastSentAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Attachment</dt>
              <dd className="mt-0.5 font-mono text-xs">{latest.lastAttachment ?? '—'}</dd>
            </div>
            {latest.retryCount > 0 && (
              <div>
                <dt className="text-muted-foreground">Retry count</dt>
                <dd className="mt-0.5 flex items-center gap-1">
                  <RefreshCw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  {latest.retryCount}
                </dd>
              </div>
            )}
            {latest.lastError && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Last error</dt>
                <dd className="mt-0.5 text-red-700 dark:text-red-300">{latest.lastError}</dd>
              </div>
            )}
          </dl>
        )}

        {hasHistory && rows.length > 1 && (
          <div className="border-t pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              All attempts
            </p>
            <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
              {rows.map((row) => (
                <li key={row.id} className="rounded-lg border border-border bg-muted/80 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{formatDateTime(row.sentAt ?? row.createdAt)}</span>
                    <Badge variant="outline" className={cn('border text-[10px]', statusBadgeClass(row.status))}>
                      {statusLabel(row.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {row.recipient}
                    {row.attachmentFilename ? ` · ${row.attachmentFilename}` : ''}
                    {row.trigger === 'RESEND' ? ' · Resend' : ''}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
