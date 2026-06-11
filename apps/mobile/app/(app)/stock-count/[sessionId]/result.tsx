// app/(app)/stock-count/[sessionId]/result.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme';

export default function AdjustmentResult() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const goHome = () => {
    router.replace('/stock-count');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>✅ Adjustment Posted</Text>
      <Text style={styles.message}>Stock count session {sessionId} has been successfully adjusted.</Text>
      <TouchableOpacity style={styles.button} onPress={goHome}>
        <Text style={styles.buttonText}>Back to Stock Count Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  message: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Inter',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});
