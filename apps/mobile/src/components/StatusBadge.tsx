import { Badge } from './ui';

const STATUS_TONES: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
  DRAFT: 'warning',
  CONFIRMED: 'success',
  POSTED: 'success',
  SENT: 'info',
  CANCELLED: 'danger',
  FULFILLED: 'success',
  PARTIAL: 'info',
  PAID: 'success',
  OVERDUE: 'danger',
  PENDING: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'default',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? 'default';
  return <Badge label={status} tone={tone} />;
}
