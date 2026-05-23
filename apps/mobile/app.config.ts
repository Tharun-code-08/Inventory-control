import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Retail IMS',
  slug: 'retail-ims-mobile',
  version: '0.0.1',
  orientation: 'portrait',
  scheme: 'retailims',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.softdigit.retailims',
  },
  android: {
    package: 'com.softdigit.retailims',
    // Allow http:// API URL during local dev (LAN IP or 10.0.2.2).
    usesCleartextTraffic: true,
    adaptiveIcon: {
      backgroundColor: '#4f46e5',
    },
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-asset', 'expo-font'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  },
};

export default config;
