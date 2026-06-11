import { RefreshControl, ScrollView, View, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useDashboard } from '@/hooks/use-dashboard';
import { PermissionGate } from '@/components/PermissionGate';
import { Card, EmptyState, KpiTile, ListRow, Muted, Screen, Subtitle, Title, colors } from '@/components/ui';
import { formatCurrency } from '@/lib/format';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const query = useDashboard();

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
      >
        <Title>Hello, {user?.name?.split(' ')[0] ?? 'there'}</Title>
        <Muted>{user?.shop?.shopName ?? user?.role ?? 'Warehouse'}</Muted>

        {query.isError ? (
          <EmptyState message="Could not load dashboard. Pull down to retry." />
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
  kpiRow: { flexDirection: 'row', gap: 12, marginVertical: 12 },
});
