import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

const statusVariantMap: Record<string, BadgeProps['variant']> = {
  ACTIVE: 'success',
  POSTED: 'success',
  COMPLETED: 'success',
  CONFIRMED: 'success',
  DRAFT: 'warning',
  LOW: 'warning',
  PENDING: 'warning',
  INACTIVE: 'destructive',
  ERROR: 'destructive',
  CANCELLED: 'destructive',
};

type StatusBadgeProps = {
  status: string;
  variant?: BadgeProps['variant'];
  className?: string;
};

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolvedVariant = variant ?? statusVariantMap[status.toUpperCase()] ?? 'secondary';

  return (
    <Badge variant={resolvedVariant} className={cn('capitalize', className)}>
      {status.toLowerCase().replace(/_/g, ' ')}
    </Badge>
  );
}
