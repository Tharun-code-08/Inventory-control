import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';
import { formatDate } from '@/lib/format';

export function AuditInfo({ createdAt, updatedAt }: { createdAt?: string | null; updatedAt?: string | null }) {
  if (!createdAt && !updatedAt) return null;
  return (
    <View style={styles.container}>
      {createdAt ? <Text style={styles.text}>Created {formatDate(createdAt)}</Text> : null}
      {updatedAt && updatedAt !== createdAt ? (
        <Text style={styles.text}>Updated {formatDate(updatedAt)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.base,
  },
  text: {
    fontSize: typography.size.xs,
    color: colors.muted,
    marginBottom: 2,
  },
});
