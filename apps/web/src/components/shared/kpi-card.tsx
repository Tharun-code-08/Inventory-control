import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { uiSurfaces } from '@/lib/ui-surfaces';

export type KpiCardProps = {
  label: string;
  value: React.ReactNode;
  /** Solid color utility for the accent bar, e.g. `bg-indigo-500`. */
  accent: string;
  /** A pre-colored icon node, e.g. `<Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />`. */
  icon: React.ReactNode;
};

export function KpiCard({ label, value, accent, icon }: KpiCardProps) {
  return (
    <Card
      interactive
      className={cn(
        'group overflow-hidden transition-shadow duration-300 hover:shadow-lg',
        uiSurfaces.pageCard,
      )}
    >
      <CardContent className="flex items-center gap-3.5 p-4">
        <span className={cn('h-11 w-1.5 shrink-0 rounded-full', accent)} aria-hidden />
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-border transition-transform duration-300 group-hover:scale-105">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums leading-tight tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
