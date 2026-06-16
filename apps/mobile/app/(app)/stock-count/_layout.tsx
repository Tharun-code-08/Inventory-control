import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function StockCountLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Stock Count' }} />
      <Stack.Screen name="[sessionId]/index" options={{ title: 'Count Session' }} />
      <Stack.Screen name="[sessionId]/review" options={{ title: 'Variance Review' }} />
      <Stack.Screen name="[sessionId]/result" options={{ title: 'Adjustment Posted' }} />
    </Stack>
  );
}
