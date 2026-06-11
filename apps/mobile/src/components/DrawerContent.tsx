import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { logoutSession } from '@/lib/session';
import { features } from '@/lib/feature-flags';
import { colors, spacing, typography } from '@/theme';
import Constants from 'expo-constants';

type DrawerItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  permission?: string;
  feature?: keyof typeof features;
};

const SECTIONS: { title: string; items: DrawerItem[] }[] = [
  {
    title: 'Procurement',
    items: [
      { label: 'Purchase Orders', icon: 'document-text-outline', route: '/(app)/purchase-orders', permission: 'purchase_order:read', feature: 'mobilePurchaseOrders' },
      { label: 'Goods Receipts', icon: 'enter-outline', route: '/(app)/goods-receipts', permission: 'goods_receipt:read', feature: 'mobileGoodsReceipts' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Sales Orders', icon: 'cart-outline', route: '/(app)/sales-orders', permission: 'shop:read', feature: 'mobileSalesOrders' },
      { label: 'Invoices', icon: 'receipt-outline', route: '/(app)/invoices', permission: 'shop:read', feature: 'mobileInvoices' },
    ],
  },
  {
    title: 'Master Data',
    items: [
      { label: 'Suppliers', icon: 'business-outline', route: '/(app)/suppliers', permission: 'supplier:read', feature: 'mobileSuppliers' },
      { label: 'Customers', icon: 'people-outline', route: '/(app)/customers', permission: 'shop:read', feature: 'mobileCustomers' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Reports', icon: 'bar-chart-outline', route: '/(app)/reports', permission: 'report:view', feature: 'mobileReports' },
      { label: 'Settings', icon: 'settings-outline', route: '/(app)/settings' },
    ],
  },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function DrawerContent({ onClose }: { onClose?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  const navigate = (route: string) => {
    onClose?.();
    router.push(route as any);
  };

  const handleSignOut = async () => {
    onClose?.();
    await logoutSession();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user?.name ?? 'U')}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>{user?.name ?? 'User'}</Text>
        <Text style={styles.email} numberOfLines={1}>{user?.email ?? ''}</Text>
        {user?.role ? <Text style={styles.role}>{user.role}</Text> : null}
        {user?.shop?.shopName ? <Text style={styles.shop} numberOfLines={1}>{user.shop.shopName}</Text> : null}
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (item.feature && !features[item.feature]) return false;
            if (item.permission && !hasPermission(user, item.permission)) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;

          return (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {visibleItems.map((item) => (
                <Pressable
                  key={item.route}
                  style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                  onPress={() => navigate(item.route)}
                >
                  <Ionicons name={item.icon} size={20} color={colors.text} />
                  <Text style={styles.itemLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.base) }]}>
        <Pressable
          style={({ pressed }) => [styles.signOut, pressed && styles.itemPressed]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        <Text style={styles.version}>v{Constants.expoConfig?.version ?? '0.0.1'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    padding: spacing.base,
    paddingTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold as '700',
  },
  name: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold as '600',
    color: colors.text,
  },
  email: {
    fontSize: typography.size.xs,
    color: colors.muted,
    marginTop: 2,
  },
  role: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium as '500',
    color: colors.primary,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shop: {
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  body: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  section: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold as '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 8,
    gap: spacing.md,
  },
  itemPressed: {
    backgroundColor: colors.borderLight,
  },
  itemLabel: {
    fontSize: typography.size.md,
    color: colors.text,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.base,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  signOutText: {
    fontSize: typography.size.md,
    color: colors.danger,
  },
  version: {
    fontSize: typography.size.xs,
    color: colors.muted,
    marginTop: spacing.sm,
  },
});
