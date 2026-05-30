import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type ReportsPageHeaderProps = {
  title: string;
  description?: string;
  lastUpdated?: Date;
  onRefresh: () => void;
  isRefreshing?: boolean;
};

function formatTimestamp(value?: Date) {
  if (!value) return '—';
  return value.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ReportsPageHeader({
  title,
  description,
  lastUpdated,
  onRefresh,
  isRefreshing,
}: ReportsPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <div className="rounded-full border border-border/60 bg-muted/40 px-3 py-1">
          Last Updated: <span className="font-medium text-foreground">{formatTimestamp(lastUpdated)}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-9"
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
          Refresh Data
        </Button>
      </div>
    </div>
  );
}
