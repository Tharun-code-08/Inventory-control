import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export function PageFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-6 w-48" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <LoadingSkeleton rows={8} cols={6} />
        </div>
      </div>
    </div>
  );
}
