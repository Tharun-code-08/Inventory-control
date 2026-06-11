import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/theme';

export function OfflineBanner() {
  const { isConnected } = useNetInfo();
  const translateY = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isConnected === false ? 0 : -50,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isConnected, translateY]);

  if (isConnected !== false) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
      <Text style={styles.text}>You are offline · Showing cached data</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  text: {
    color: '#FFFFFF',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium as '500',
  },
});
