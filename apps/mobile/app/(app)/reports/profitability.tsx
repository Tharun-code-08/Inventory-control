import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { PermissionGate } from '@/components/PermissionGate';
import { ListSkeleton } from '@/components/ListSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { useProfitabilityReport, type ProfitabilityItem } from '@/hooks/use-reports';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId } from '@/lib/shop-scope';
import { Badge, Card, EmptyState, KpiTile, Muted, Screen, Subtitle } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import { spacing } from '@/theme';

function recoTone(r: ProfitabilityItem['recommendation']) {
  if (r === 'STOP_SELLING') return 'danger';
  if (r === 'REDUCE_DISCOUNT') return 'warning';
  if (r === 'PROMOTE') return 'success';
  return 'default';
}

export default function ProfitabilityReportScreen() {
  const user = useAuthStore((s) => s.user);
  const shopId = defaultShopId(user);
  const query = useProfitabilityReport(shopId || undefined);
  const summary = query.data?.summary;

  return (
    <PermissionGate permission="report:view">
      <Screen style={styles.screen}>
        {query.isLoading ? (
          <ListSkeleton />
        ) : query.isError ? (
          <ErrorState message="Could not load profitability." onRetry={() => query.refetch()} />
        ) : (
          <FlatList
            data={query.data?.items ?? []}
            keyExtractor={(item) => item.productId}
            refreshControl={
              <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
            }
            ListHeaderComponent={
              summary ? (
                <View style={styles.kpis}>
                  <KpiTile label="Revenue (90d)" value={formatCurrency(summary.totalRevenue)} />
                  <KpiTile label="Profit (90d)" value={formatCurrency(summary.totalProfit)} />
                  <KpiTile label="Avg margin" value={`${summary.avgMargin}%`} />
                </View>
              ) : null
            }
            ListEmptyComponent={<EmptyState message="No sales in this period." icon="trending-up-outline" />}
            renderItem={({ item }) => (
              <Card>
                <View style={styles.row}>
                  <Subtitle>{item.productCode}</Subtitle>
                  <Badge label={`${item.margin}%`} tone={recoTone(item.recommendation)} />
                </View>
                <Muted>{item.name}</Muted>
                <View style={styles.metaRow}>
                  <Muted>Rev {formatCurrency(item.revenue)}</Muted>
                  <Muted>Profit {formatCurrency(item.profit)} · {item.unitsSold} sold</Muted>
                </View>
              </Card>
            )}
          />
        )}
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  kpis: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, flexWrap: 'wrap' },
});
