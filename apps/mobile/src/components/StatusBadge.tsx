import { Pressable } from 'react-native';
import { Badge } from './ui';
import { colors } from '@/theme';

type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

const STATUS_TONES: Record<string, BadgeTone> = {
  DRAFT: 'warning',
  CONFIRMED: 'success',
  POSTED: 'success',
  SENT: 'info',
  CANCELLED: 'danger',
  FULFILLED: 'success',
  PARTIAL: 'info',
  PARTIALLY_RECEIVED: 'info',
  FULLY_RECEIVED: 'success',
  PAID: 'success',
  OVERDUE: 'danger',
  PENDING: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'default',
  default: 'default',
  ALL: 'primary',
};

export function StatusBadge({
  status,
  label,
  onPress,
  active,
}: {
  status: string;
  label?: string;
  onPress?: () => void;
  active?: boolean;
}) {
  const tone = active ? 'primary' : (STATUS_TONES[status] ?? 'default');
  const badge = <Badge label={label ?? status} tone={tone} />;
  if (!onPress) return badge;
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      {badge}
    </Pressable>
  );
}
