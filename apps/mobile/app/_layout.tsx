import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { bootstrapSession } from '@/lib/session';
import { asyncStoragePersister, queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme';

const PERSISTED_KEYS = ['dashboard', 'products', 'alerts', 'shops'];

export default function RootLayout() {
  const [booting, setBooting] = useState(true);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    bootstrapSession().finally(() => setBooting(false));
  }, []);

  if (booting || !initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const key = query.queryKey[0];
            return query.state.status === 'success' && PERSISTED_KEYS.includes(key as string);
          },
        },
      }}
    >
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(app)" />
      </Stack>
    </PersistQueryClientProvider>
  );
}
