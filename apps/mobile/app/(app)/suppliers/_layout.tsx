import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function SuppliersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Suppliers' }} />
      <Stack.Screen name="[id]" options={{ title: 'Supplier' }} />
    </Stack>
  );
}
