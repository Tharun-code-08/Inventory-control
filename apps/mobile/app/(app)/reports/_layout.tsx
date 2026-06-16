import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function ReportsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Reports' }} />
      <Stack.Screen name="dead-stock" options={{ title: 'Dead Stock' }} />
      <Stack.Screen name="reorder" options={{ title: 'Reorder' }} />
      <Stack.Screen name="profitability" options={{ title: 'Profitability' }} />
      <Stack.Screen name="movement" options={{ title: 'Stock Movement' }} />
    </Stack>
  );
}
