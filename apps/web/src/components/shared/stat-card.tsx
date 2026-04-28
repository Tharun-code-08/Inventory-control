import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

type StatCardProps = {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  className?: string;
};

const trendConfig = {
  up: { icon: TrendingUp, color: 'text-green-600' },
  down: { icon: TrendingDown, color: 'text-red-600' },
  neutral: { icon: Minus, color: 'text-muted-foreground' },
} as const;

export function StatCard({ title, value, change, trend, icon: Icon, className }: StatCardProps) {
  const trendInfo = trend ? trendConfig[trend] : null;

  return (
    <div className={cn('rounded-xl border bg-card p-6 shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div className="mt-3">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
      </div>
      {change && trendInfo && (
        <div className="mt-2 flex items-center gap-1">
          <trendInfo.icon className={cn('h-4 w-4', trendInfo.color)} />
          <span className={cn('text-sm font-medium', trendInfo.color)}>{change}</span>
          <span className="text-sm text-muted-foreground">from last period</span>
        </div>
      )}
    </div>
  );
}
