import { cn } from '@/lib/cn';

const variants: Record<string, string> = {
  DRAFT: 'border border-amber-300 bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300',
  POSTED: 'border border-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  CONFIRMED: 'border border-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  ACTIVE: 'border border-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  COMPLETED: 'border border-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  FULLY_RECEIVED: 'border border-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  PARTIALLY_RECEIVED: 'border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-300',
  SENT: 'border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-300',
  PAID: 'border border-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  PENDING: 'border border-amber-300 bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300',
  OPEN: 'border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-300',
  CLOSED: 'border border-border bg-muted text-muted-foreground',
  APPROVED: 'border border-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  INACTIVE: 'border border-border bg-muted text-muted-foreground',
  DEACTIVE: 'border border-rose-300 bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300',
  DEACTIVATED: 'border border-rose-300 bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300',
  CANCELLED: 'border border-border bg-muted text-foreground',
};

function formatStatusLabel(status: string): string {
  return status.replaceAll('_', ' ');
}

export function StatusBadge({ status, compact }: { status: string; compact?: boolean }) {
  const key = status?.toUpperCase?.() ?? status;
  const cls = variants[key] ?? 'border border-border bg-muted text-foreground';
  const label = formatStatusLabel(status);

  return (
    <span
      key={label}
      className={cn(
        'motion-badge-crossfade inline-flex items-center rounded-full font-semibold tracking-wide',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        cls,
      )}
      data-testid="status-badge"
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
}
