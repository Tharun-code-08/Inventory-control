import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

export const colors = {
  primary: '#4f46e5',
  primaryDark: '#4338ca',
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  danger: '#dc2626',
  success: '#16a34a',
  warning: '#d97706',
};

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'secondary' && styles.buttonTextSecondary,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput {...props} style={[styles.input, props.style]} placeholderTextColor={colors.muted} />;
}

export function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'warning' }) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'success' && styles.badgeSuccess,
        tone === 'warning' && styles.badgeWarning,
      ]}
    >
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Muted>{message}</Muted>
    </View>
  );
}

export function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.kpi}>
      <Muted>{label}</Muted>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

export const ListRow = forwardRef<
  View,
  {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    onPress?: () => void;
  }
>(function ListRow({ title, subtitle, right, onPress }, ref) {
  const content = (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Muted>{subtitle}</Muted> : null}
      </View>
      {right}
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        style={({ pressed }) => [styles.rowWrap, pressed && styles.rowPressed]}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View ref={ref} style={styles.rowWrap}>
      {content}
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  muted: { fontSize: 14, color: colors.muted },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  buttonTextSecondary: { color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: colors.text,
    marginBottom: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeWarning: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.text },
  empty: { padding: 24, alignItems: 'center' },
  kpi: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiValue: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 4 },
  rowWrap: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  rowPressed: { backgroundColor: '#f1f5f9' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
});
