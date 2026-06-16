import { Redirect } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/store/authStore';
import { DrawerContent } from '@/components/DrawerContent';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useNotificationSetup, useNotificationListener } from '@/hooks/use-notifications';
import { colors } from '@/theme';

function NotificationInitializer() {
  useNotificationSetup();
  useNotificationListener();
  return null;
}

export default function AppLayout() {
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <NotificationInitializer />
        <Drawer
          drawerContent={(props) => (
            <DrawerContent onClose={() => props.navigation.closeDrawer()} />
          )}
          screenOptions={{
            headerShown: false,
            drawerStyle: { width: 280, backgroundColor: colors.bg },
          }}
        >
          <Drawer.Screen name="(tabs)" options={{ title: 'Home' }} />
          <Drawer.Screen name="approvals" options={{ title: 'Approval Inbox' }} />
          <Drawer.Screen name="purchase-orders" options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name="goods-receipts" options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name="sales-orders" options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name="invoices" options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name="suppliers" options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name="customers" options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name="reports" options={{ drawerItemStyle: { display: 'none' } }} />
          <Drawer.Screen name="barcode-print" options={{ title: 'Print Labels' }} />
          <Drawer.Screen name="search" options={{ drawerItemStyle: { display: 'none' } }} />
        </Drawer>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
