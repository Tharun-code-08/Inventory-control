import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function SalesOrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Sales Orders' }} />
      <Stack.Screen name="[id]" options={{ title: 'Sales Order' }} />
    </Stack>
  );
}
