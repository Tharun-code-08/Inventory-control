import type { ElementType } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { AnimatedNumber } from '@/components/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { type KpiTrend } from '@/lib/kpi-trend';

export type KpiAccent = 'indigo' | 'sky' | 'emerald' | 'amber' | 'violet' | 'rose';

const ACCENTS: Record<KpiAccent, { chip: string; glow: string; ring: string }> = {
  indigo: {
    chip: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-400/15 dark:text-indigo-300',
    glow: 'from-indigo-500 to-violet-500',
    ring: 'group-hover:ring-indigo-400/40',
  },
  sky: {
    chip: 'bg-sky-500/12 text-sky-600 dark:text-sky-400 dark:bg-sky-400/15 dark:text-sky-300',
    glow: 'from-sky-500 to-cyan-400',
    ring: 'group-hover:ring-sky-400/40',
  },
  emerald: {
    chip: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-400/15 dark:text-emerald-300',
    glow: 'from-emerald-500 to-teal-400',
    ring: 'group-hover:ring-emerald-400/40',
  },
  amber: {
    chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 dark:bg-amber-400/15 dark:text-amber-300',
    glow: 'from-amber-500 to-orange-400',
    ring: 'group-hover:ring-amber-400/40',
  },
  violet: {
    chip: 'bg-violet-500/12 text-violet-600 dark:text-violet-400 dark:bg-violet-400/15 dark:text-violet-300',
    glow: 'from-violet-500 to-fuchsia-400',
    ring: 'group-hover:ring-violet-400/40',
  },
  rose: {
    chip: 'bg-rose-500/12 text-rose-600 dark:text-rose-400 dark:bg-rose-400/15 dark:text-rose-300',
    glow: 'from-rose-500 to-pink-400',
    ring: 'group-hover:ring-rose-400/40',
  },
};

export type DashboardKpiCardProps = {
  label: string;
  numericValue: number;
  format?: (value: number) => string;
  context?: string;
  trend?: KpiTrend;
  icon: ElementType;
  accent?: KpiAccent;
  ariaLabel: string;
  tooltip?: string;
  onClick: () => void;
};

export function DashboardKpiCard({
  label,
  numericValue,
  format,
  context,
  trend,
  icon: Icon,
  accent = 'indigo',
  ariaLabel,
  tooltip,
  onClick,
}: DashboardKpiCardProps) {
  const a = ACCENTS[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      aria-label={ariaLabel}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 text-left',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-18px_rgba(15,23,42,0.18)] ring-1 ring-transparent',
        'transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgba(15,23,42,0.28)]',
        a.ring,
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      {/* soft accent glow */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br opacity-[0.10] blur-2xl transition-opacity duration-300 group-hover:opacity-25',
          a.glow,
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', a.chip)}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-muted-foreground"
          aria-hidden
        />
      </div>

      <p className="mt-4 truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>

      <AnimatedNumber
        value={numericValue}
        format={format}
        className="mt-1 block text-[1.75rem] font-bold leading-tight tabular-nums tracking-tight text-foreground"
      />

      <div className="mt-2 flex min-h-[20px] items-center gap-2">
        {trend ? (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
              trend.direction === 'up' && 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300',
              trend.direction === 'down' && 'bg-rose-500/12 text-rose-600 dark:text-rose-300',
              trend.direction !== 'up' && trend.direction !== 'down' && 'bg-muted text-muted-foreground',
            )}
          >
            {trend.label}
          </span>
        ) : null}
        {context ? <span className="truncate text-xs text-muted-foreground">{context}</span> : null}
      </div>
    </button>
  );
}

export function DashboardKpiCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="mt-4 h-3 w-24" />
      <Skeleton className="mt-2 h-8 w-28" />
      <Skeleton className="mt-3 h-4 w-20 rounded-full" />
    </div>
  );
}
