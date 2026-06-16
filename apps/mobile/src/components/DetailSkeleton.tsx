import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';

export function DetailSkeleton() {
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
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.titleBar} />
      <View style={styles.badgeBar} />
      <View style={styles.card}>
        <View style={styles.fieldBar} />
        <View style={styles.fieldBar} />
        <View style={styles.fieldBar} />
        <View style={styles.fieldBarShort} />
      </View>
      <View style={styles.card}>
        <View style={styles.fieldBar} />
        <View style={styles.fieldBarShort} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.base },
  titleBar: {
    height: 22,
    width: '50%',
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  badgeBar: {
    height: 20,
    width: 80,
    backgroundColor: colors.borderLight,
    borderRadius: 6,
    marginBottom: spacing.base,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  fieldBar: {
    height: 14,
    width: '80%',
    backgroundColor: colors.borderLight,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  fieldBarShort: {
    height: 14,
    width: '50%',
    backgroundColor: colors.borderLight,
    borderRadius: 4,
  },
});
