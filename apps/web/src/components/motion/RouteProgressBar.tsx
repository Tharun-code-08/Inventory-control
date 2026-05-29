import { cn } from '@/lib/cn';

type RouteProgressBarProps = {
  active: boolean;
  className?: string;
};

export function RouteProgressBar({ active, className }: RouteProgressBarProps) {
  if (!active) return null;

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 origin-left bg-indigo-600 motion-route-progress-bar',
        className,
      )}
      role="progressbar"
      aria-hidden="true"
    />
  );
}
