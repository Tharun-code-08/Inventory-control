import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function GoodsReceiptsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Goods Receipts' }} />
      <Stack.Screen name="[id]" options={{ title: 'Goods Receipt' }} />
    </Stack>
  );
}
