import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function SearchLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Search' }} />
    </Stack>
  );
}
