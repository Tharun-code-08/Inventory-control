import { Skeleton } from '@/components/ui/skeleton';

type LoadingSkeletonProps = {
  rows?: number;
  /** @deprecated use cols */
  columns?: number;
  cols?: number;
};

export function LoadingSkeleton({ rows = 5, columns, cols: colsProp }: LoadingSkeletonProps) {
  const cols = colsProp ?? columns ?? 5;

  return (
    <div className="w-full space-y-2" aria-busy="true" aria-label="Loading content">
      <div className="flex gap-4 border-b pb-3">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
