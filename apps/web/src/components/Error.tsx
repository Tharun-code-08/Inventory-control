import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';

type ErrorProps = {
  message?: string;
  /** Optional retry handler; renders a retry button when provided. */
  onRetry?: () => void;
  className?: string;
};

/** Inline error state used by report views and async panels. */
export default function Error({
  message = 'Something went wrong.',
  onRetry,
  className,
}: ErrorProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 py-10 px-6 text-center',
        className,
      )}
      role="alert"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>
      <p className="max-w-md text-sm font-medium text-slate-700">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
