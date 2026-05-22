import { cn } from '@/lib/cn';

const variants: Record<string, string> = {
  DRAFT: 'border border-amber-300 bg-amber-100 text-amber-800',
  POSTED: 'border border-emerald-300 bg-emerald-100 text-emerald-800',
  CONFIRMED: 'border border-emerald-300 bg-emerald-100 text-emerald-800',
  ACTIVE: 'border border-emerald-300 bg-emerald-100 text-emerald-800',
  COMPLETED: 'border border-emerald-300 bg-emerald-100 text-emerald-800',
  FULLY_RECEIVED: 'border border-emerald-300 bg-emerald-100 text-emerald-800',
  PARTIALLY_RECEIVED: 'border border-sky-200 bg-sky-50 text-sky-800',
  SENT: 'border border-sky-200 bg-sky-50 text-sky-800',
  INACTIVE: 'border border-slate-300 bg-slate-100 text-slate-600',
  DEACTIVE: 'border border-rose-300 bg-rose-100 text-rose-800',
  DEACTIVATED: 'border border-rose-300 bg-rose-100 text-rose-800',
  CANCELLED: 'border border-slate-300 bg-slate-100 text-slate-700',
};

export function StatusBadge({ status, compact }: { status: string; compact?: boolean }) {
  const key = status?.toUpperCase?.() ?? status;
  const cls = variants[key] ?? 'border border-slate-200 bg-slate-50 text-slate-700';
  return (
    <span
      className={cn(
        'rounded-full font-semibold tracking-wide',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        cls,
      )}
      data-testid="status-badge"
    >
      {status.replaceAll('_', ' ')}
    </span>
  );
}
