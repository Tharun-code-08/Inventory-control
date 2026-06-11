import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/theme';

export function SectionHeader({
  title,
  icon,
  count,
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  count?: number;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {icon ? <Ionicons name={icon} size={18} color={colors.text} style={styles.icon} /> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {count != null ? (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: spacing.sm },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
});
