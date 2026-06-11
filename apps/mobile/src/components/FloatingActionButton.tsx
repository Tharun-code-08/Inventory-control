// src/components/FloatingActionButton.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { colors } from '@/theme';

interface FABProps {
  onPress: () => void;
  label?: string;
}

export const FloatingActionButton: React.FC<FABProps> = ({ onPress, label = '+' }) => (
  <TouchableOpacity onPress={onPress} style={styles.fab} activeOpacity={0.8}>
    <View style={styles.inner}>
      <Text style={styles.label}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  inner: {
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 32,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});
