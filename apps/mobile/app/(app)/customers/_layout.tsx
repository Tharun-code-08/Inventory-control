import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function CustomersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Customers' }} />
      <Stack.Screen name="[id]" options={{ title: 'Customer' }} />
    </Stack>
  );
}
