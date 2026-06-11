import { RefreshControl, ScrollView, View, Pressable, Text, StyleSheet } from 'react-native';
import { Link, router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useDashboard } from '@/hooks/use-dashboard';
import { hasPermission } from '@/lib/permissions';
import { PermissionGate } from '@/components/PermissionGate';
import { AppIcon } from '@/components/AppIcon';
import { Card, EmptyState, KpiTile, ListRow, Muted, Screen, Subtitle, Title } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import { colors, spacing, typography } from '@/theme';
import { shadows } from '@/theme/shadows';

type QuickAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: Href;
  permission: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'New GI', icon: 'add-circle-outline', route: '/goods-issues/new', permission: 'goods_issue:create' },
  { label: 'View POs', icon: 'document-text-outline', route: '/purchase-orders', permission: 'purchase_order:read' },
  { label: 'View GRs', icon: 'enter-outline', route: '/goods-receipts', permission: 'goods_receipt:read' },
];

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const query = useDashboard();

  const visibleActions = QUICK_ACTIONS.filter((a) => hasPermission(user, a.permission));

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
      >
        <View style={styles.header}>
          <AppIcon size={36} />
          <View style={styles.headerText}>
            <Title>Hello, {user?.name?.split(' ')[0] ?? 'there'}</Title>
            <Muted>{user?.shop?.shopName ?? user?.role ?? 'Warehouse'}</Muted>
          </View>
        </View>

        {visibleActions.length > 0 ? (
          <View style={styles.quickActions}>
            {visibleActions.map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
                onPress={() => router.push(action.route)}
              >
                <Ionicons name={action.icon} size={22} color={colors.primary} />
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {query.isError ? (
          <EmptyState message="Could not load dashboard. Pull down to retry." icon="cloud-offline-outline" />
        ) : query.isLoading ? (
          <EmptyState message="Loading dashboard…" />
        ) : (
          <>
            <View style={styles.kpiRow}>
              <KpiTile label="Products" value={query.data?.totalProducts ?? 0} />
              <KpiTile label="Low stock" value={query.data?.lowStockCount ?? 0} />
            </View>
            <View style={styles.kpiRow}>
              <KpiTile label="Stock value" value={formatCurrency(query.data?.totalStockValue ?? 0)} />
              <KpiTile label="Movements" value={query.data?.recentTransactions ?? 0} />
            </View>

            <Subtitle>Low stock</Subtitle>
            {(query.data?.lowStockProducts ?? []).length === 0 ? (
              <Card>
                <Muted>No low-stock items right now.</Muted>
              </Card>
            ) : (
              (query.data?.lowStockProducts ?? []).slice(0, 5).map((p) => (
                <Link key={p.id} href={`/products/${p.id}`} asChild>
                  <ListRow
                    title={p.productCode}
                    subtitle={`${p.description} · stock ${p.currentStock ?? 0}`}
                  />
                </Link>
              ))
            )}

            <PermissionGate permission="goods_issue:read">
              <Subtitle>Recent goods issues</Subtitle>
              {(query.data?.recentGoodsIssues ?? []).length === 0 ? (
                <Card>
                  <Muted>No recent issues.</Muted>
                </Card>
              ) : (
                (query.data?.recentGoodsIssues ?? []).slice(0, 5).map((gi) => (
                  <Link key={gi.id} href={`/goods-issues/${gi.id}`} asChild>
                    <ListRow
                      title={gi.giNumber}
                      subtitle={`${gi.shop?.shopName ?? ''} · ${gi.status}`}
                    />
                  </Link>
                ))
              )}
            </PermissionGate>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  headerText: { flex: 1 },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    ...shadows.sm,
  },
  quickActionPressed: {
    backgroundColor: colors.borderLight,
  },
  quickActionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium as '500',
    color: colors.text,
  },
  kpiRow: { flexDirection: 'row', gap: spacing.md, marginVertical: spacing.md },
});
