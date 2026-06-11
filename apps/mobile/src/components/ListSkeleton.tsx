import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';

function SkeletonRow() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.row, { opacity }]}>
      <View style={styles.titleBar} />
      <View style={styles.subtitleBar} />
    </Animated.View>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.sm },
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  titleBar: {
    height: 14,
    width: '60%',
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  subtitleBar: {
    height: 12,
    width: '40%',
    backgroundColor: colors.borderLight,
    borderRadius: 4,
  },
});
