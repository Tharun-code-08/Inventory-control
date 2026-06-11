import { Component, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/theme';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<Props & { onReset: () => void }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  reset = () => {
    this.props.onReset();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="warning-outline" size={48} color={colors.danger} />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.props.fallbackMessage ?? this.state.error?.message ?? 'An unexpected error occurred.'}
          </Text>
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundary({ children, fallbackMessage }: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundaryInner onReset={reset} fallbackMessage={fallbackMessage}>
          {children}
        </ErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
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
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold as '600',
  },
});
