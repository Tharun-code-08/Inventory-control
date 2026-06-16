import { View, Text, StyleSheet } from 'react-native';

const BRAND_BLUE = '#2D2BB8';

export function AppLogo({ height = 48 }: { height?: number }) {
  const iconSize = height * 0.75;
  return (
    <View style={styles.container}>
      <View style={[styles.icon, { width: iconSize, height: iconSize, borderRadius: iconSize * 0.22 }]}>
        <Text style={[styles.iconText, { fontSize: iconSize * 0.45 }]}>SD</Text>
      </View>
      <View style={styles.textGroup}>
        <Text style={[styles.brand, { fontSize: height * 0.38 }]}>SOFT DIGITS</Text>
        <Text style={[styles.sub, { fontSize: height * 0.22 }]}>IMS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  textGroup: {
    justifyContent: 'center',
  },
  brand: {
    color: '#000000',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  sub: {
    color: BRAND_BLUE,
    fontWeight: '700',
    letterSpacing: 3,
  },
});
