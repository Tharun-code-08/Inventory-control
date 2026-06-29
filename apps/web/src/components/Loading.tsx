import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type LoadingProps = {
  /** Optional message announced to screen readers and shown beneath the spinner. */
  message?: string;
  className?: string;
};

/** Centered loading indicator used by report views and async panels. */
export default function Loading({ message = 'Loading…', className }: LoadingProps) {
  return (
    <div
      className={cn('flex w-full flex-col items-center justify-center gap-3 py-12 text-slate-500', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
