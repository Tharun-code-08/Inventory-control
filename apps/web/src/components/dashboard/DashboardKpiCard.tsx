import type { ElementType } from 'react';
import { ArrowRight } from 'lucide-react';
import { AnimatedNumber } from '@/components/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { trendToneClass, type KpiTrend } from '@/lib/kpi-trend';

export type DashboardKpiCardProps = {
  label: string;
  numericValue: number;
  format?: (value: number) => string;
  context?: string;
  trend?: KpiTrend;
  icon: ElementType;
  iconClassName?: string;
  iconWrapClassName?: string;
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
  iconClassName,
  iconWrapClassName,
  ariaLabel,
  tooltip,
  onClick,
}: DashboardKpiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      aria-label={ariaLabel}
      className={cn(
        'motion-kpi-card group surface-2 flex w-full flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              iconWrapClassName,
            )}
          >
            <Icon className={cn('h-4 w-4', iconClassName)} aria-hidden />
          </div>
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
        </div>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground"
          aria-hidden
        />
      </div>

      <AnimatedNumber
        value={numericValue}
        format={format}
        className="mt-3 block text-3xl font-bold tabular-nums tracking-tight text-foreground"
      />

      {context ? (
        <p className="mt-2 text-xs text-muted-foreground">{context}</p>
      ) : null}

      {trend ? (
        <p className={cn('mt-1 text-xs font-medium tabular-nums', trendToneClass(trend.direction))}>
          {trend.label}
        </p>
      ) : !context ? (
        <p className="mt-2 text-xs text-transparent select-none" aria-hidden>
          —
        </p>
      ) : null}
    </button>
  );
}

export function DashboardKpiCardSkeleton() {
  return (
    <div className="surface-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="mt-4 h-9 w-28" />
      <Skeleton className="mt-3 h-3 w-32" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}
