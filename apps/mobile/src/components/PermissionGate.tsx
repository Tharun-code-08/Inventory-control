import { View } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { EmptyState } from '@/components/ui';

export function PermissionGate({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  if (!hasPermission(user, permission)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState message="You do not have permission to view this section." />
      </View>
    );
  }
  return <>{children}</>;
}
