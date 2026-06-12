import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { colors } from '@/theme';

export default function TabsLayout() {
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation();

  const showProducts = hasPermission(user, 'product:read');
  const showGi = hasPermission(user, 'goods_issue:read');
  const showAlerts = hasPermission(user, 'report:view');

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border },
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={{ marginLeft: 12 }}
            hitSlop={8}
          >
            <Ionicons name="menu-outline" size={24} color={colors.text} />
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
          headerShown: false,
          title: 'Products',
          href: showProducts ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="goods-issues"
        options={{
          headerShown: false,
          title: 'Issues',
          href: showGi ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="exit-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts/index"
        options={{
          title: 'Alerts',
          href: showAlerts ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
