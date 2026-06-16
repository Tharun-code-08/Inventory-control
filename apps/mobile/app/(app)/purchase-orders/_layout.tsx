import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function PurchaseOrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Purchase Orders' }} />
      <Stack.Screen name="[id]" options={{ title: 'Purchase Order' }} />
    </Stack>
  );
}
