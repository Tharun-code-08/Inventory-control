import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';

const BRAND_BLUE = '#2D2BB8';

export function AppIcon({ size = 32 }: { size?: number }) {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size * 0.22 }]}>
      <Text style={[styles.text, { fontSize: size * 0.45 }]}>SD</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});
