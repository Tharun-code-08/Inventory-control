import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { PermissionGate } from '@/components/PermissionGate';
import { ListSkeleton } from '@/components/ListSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { useDeadStockReport, type DeadStockItem } from '@/hooks/use-reports';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId } from '@/lib/shop-scope';
import { extractApiError } from '@/lib/envelope';
import { Badge, Card, EmptyState, KpiTile, Muted, Screen, Subtitle } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import { spacing } from '@/theme';

function severityTone(s: DeadStockItem['severity']) {
  return s === 'CRITICAL' ? 'danger' : s === 'HIGH' ? 'warning' : 'default';
}

export default function DeadStockReportScreen() {
  const user = useAuthStore((s) => s.user);
  const shopId = defaultShopId(user);
  const query = useDeadStockReport(shopId || undefined);
  const summary = query.data?.summary;

  return (
    <PermissionGate permission="report:view">
      <Screen style={styles.screen}>
        {query.isLoading ? (
          <ListSkeleton />
        ) : query.isError ? (
          <ErrorState message={extractApiError(query.error) ?? 'Could not load dead stock.'} onRetry={() => query.refetch()} />
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
                  <KpiTile label="Dead items" value={summary.totalDeadItems} />
                  <KpiTile label="Value stuck" value={formatCurrency(summary.totalDeadValue)} />
                </View>
              ) : null
            }
            ListEmptyComponent={<EmptyState message="No dead stock 🎉" icon="checkmark-circle-outline" />}
            renderItem={({ item }) => (
              <Card>
                <View style={styles.row}>
                  <Subtitle>{item.productCode}</Subtitle>
                  <Badge label={item.severity} tone={severityTone(item.severity)} />
                </View>
                <Muted>{item.name}</Muted>
                <View style={styles.metaRow}>
                  <Muted>{formatCurrency(item.stockValue)} stuck</Muted>
                  <Muted>{item.daysUnsold}d unsold · {item.currentStock} in stock</Muted>
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
  kpis: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, flexWrap: 'wrap' },
});
