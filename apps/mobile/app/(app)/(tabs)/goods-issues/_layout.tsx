import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function GoodsIssuesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Goods Issues' }} />
      <Stack.Screen name="[id]" options={{ title: 'Goods Issue' }} />
      <Stack.Screen name="new" options={{ title: 'New Issue' }} />
    </Stack>
  );
}
