import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function WarehousesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Warehouses' }} />
      <Stack.Screen name="[id]" options={{ title: 'Warehouse' }} />
    </Stack>
  );
}
