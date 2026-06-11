import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';
import { Muted } from './ui';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Muted style={{ marginTop: spacing.md }}>{message}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
