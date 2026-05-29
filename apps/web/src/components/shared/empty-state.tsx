import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'motion-fade-up flex flex-col items-center justify-center py-16 text-center',
        className,
      )}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/80 ring-1 ring-border">
        <Icon className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
