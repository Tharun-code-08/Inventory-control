import { Redirect, Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Alert } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { logoutSession } from '@/lib/session';
import { colors } from '@/components/ui';

export default function AppLayout() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  const showProducts = hasPermission(user, 'product:read');
  const showGi = hasPermission(user, 'goods_issue:read');
  const showAlerts = hasPermission(user, 'report:view');

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.primary,
        headerRight: () => (
          <Pressable
            onPress={() => {
              Alert.alert('Sign out', 'Leave this session?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign out',
                  style: 'destructive',
                  onPress: async () => {
                    await logoutSession();
                    router.replace('/(auth)/login');
                  },
                },
              ]);
            }}
            style={{ marginRight: 12 }}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.muted} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          href: showProducts ? '/products' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="goods-issues"
        options={{
          title: 'Issues',
          href: showGi ? '/goods-issues' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="exit-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          href: showAlerts ? '/alerts' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="products/[id]" options={{ href: null, title: 'Product' }} />
      <Tabs.Screen name="goods-issues/new" options={{ href: null, title: 'New issue' }} />
      <Tabs.Screen name="goods-issues/[id]" options={{ href: null, title: 'Goods issue' }} />
    </Tabs>
  );
}
