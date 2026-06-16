import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';

export function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  label: {
    fontSize: typography.size.base,
    color: colors.muted,
    flex: 1,
  },
  value: {
    fontSize: typography.size.base,
    color: colors.text,
    fontWeight: typography.weight.medium,
    flex: 1,
    textAlign: 'right',
  },
});
