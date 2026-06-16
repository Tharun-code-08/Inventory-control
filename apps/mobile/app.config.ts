import type { ExpoConfig } from 'expo/config';

// usesCleartextTraffic isn't in the ExpoConfig type but is supported at runtime
const config = {
  name: 'SoftdigitIMS',
  slug: 'retail-ims-mobile',
  owner: 'tharuncode',
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
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-asset',
    'expo-font',
    'expo-file-system',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow SoftdigitIMS to use the camera to scan product barcodes.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  updates: {
    enabled: false,
  },
  extra: {
    // Default to the production API so shipped/EAS builds work without a .env
    // (EXPO_PUBLIC_API_URL in .env overrides this for local dev against localhost).
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://softdigitconsulting.com',
    eas: {
      projectId: '4b48c460-018d-41ec-bd1b-29e0a752bbff',
    },
  },
};

export default config as ExpoConfig;
