import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

const statusVariantMap: Record<string, BadgeProps['variant']> = {
  ACTIVE: 'success',
  POSTED: 'success',
  COMPLETED: 'success',
  CONFIRMED: 'success',
  PAID: 'success',
  APPROVED: 'success',
  DRAFT: 'warning',
  LOW: 'warning',
  PENDING: 'warning',
  OPEN: 'info',
  INACTIVE: 'destructive',
  ERROR: 'destructive',
  CANCELLED: 'destructive',
  CLOSED: 'secondary',
};

type StatusBadgeProps = {
  status: string;
  variant?: BadgeProps['variant'];
  className?: string;
  compact?: boolean;
};

function formatStatusLabel(status: string): string {
  return status.toLowerCase().replace(/_/g, ' ');
}

export function StatusBadge({ status, variant, className, compact }: StatusBadgeProps) {
  const normalized = status.toUpperCase();
  const resolvedVariant = variant ?? statusVariantMap[normalized] ?? 'secondary';
  const label = formatStatusLabel(status);

  return (
    <Badge
      key={label}
      variant={resolvedVariant}
      className={cn('motion-badge-crossfade capitalize', compact && 'text-[10px]', className)}
      aria-label={`Status: ${label}`}
    >
      {label}
    </Badge>
  );
}
