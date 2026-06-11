import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { colors, spacing, typography } from '@/theme';

export function PermissionGate({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  if (hasPermission(user, permission)) return <>{children}</>;

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed-outline" size={48} color={colors.muted} />
      <Text style={styles.title}>Access denied</Text>
      <Text style={styles.message}>You don't have permission to view this page.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    backgroundColor: colors.bg,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold as '600',
    color: colors.text,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.size.sm,
    color: colors.muted,
    textAlign: 'center',
  },
});
