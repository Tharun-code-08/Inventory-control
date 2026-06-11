import * as React from 'react';
import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as themeColors } from '@/theme';

export const colors = themeColors;

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.screen, style]}>{children}</View>
    </SafeAreaView>
  );
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

export function Muted({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
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

export const Input = forwardRef<TextInput, TextInputProps>(function Input(props, ref) {
  return <TextInput ref={ref} {...props} style={[styles.input, props.style]} placeholderTextColor={colors.muted} />;
});

export function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' }) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'success' && styles.badgeSuccess,
        tone === 'warning' && styles.badgeWarning,
        tone === 'danger' && styles.badgeDanger,
        tone === 'info' && styles.badgeInfo,
        tone === 'primary' && styles.badgePrimary,
      ]}
    >
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function EmptyState({ message, icon }: { message: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.empty}>
      {icon ? <Ionicons name={icon} size={40} color={colors.muted} style={{ marginBottom: 8 }} /> : null}
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
  badgeSuccess: { backgroundColor: colors.successLight },
  badgeWarning: { backgroundColor: colors.warningLight },
  badgeDanger: { backgroundColor: colors.dangerLight },
  badgeInfo: { backgroundColor: colors.infoLight },
  badgePrimary: { backgroundColor: colors.primaryLight },
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
