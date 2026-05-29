import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type FormErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function FormErrorBanner({
  message,
  onRetry,
  retryLabel = 'Retry',
  className,
}: FormErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        'motion-error-banner flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry} className="shrink-0">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
