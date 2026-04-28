import { cn } from '@/lib/cn';

const variants: Record<string, string> = {
  DRAFT: 'border border-amber-200 bg-amber-50 text-amber-700',
  POSTED: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  CONFIRMED: 'border border-blue-200 bg-blue-50 text-blue-700',
  CANCELLED: 'border border-slate-300 bg-slate-100 text-slate-700',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = variants[status] ?? 'bg-zinc-100 text-zinc-800';
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide', cls)} data-testid="status-badge">
      {status}
    </span>
  );
}
