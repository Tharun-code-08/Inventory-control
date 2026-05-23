import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { uiSurfaces } from '@/lib/ui-surfaces';

export type KpiCardProps = {
  label: string;
  value: React.ReactNode;
  accent: string;
  icon: React.ReactNode;
};

export function KpiCard({ label, value, accent, icon }: KpiCardProps) {
  return (
    <Card className={cn('overflow-hidden', uiSurfaces.pageCard)}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('w-1 self-stretch rounded-full', accent)} aria-hidden />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
