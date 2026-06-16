import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { PermissionGate } from '@/components/PermissionGate';
import { ListSkeleton } from '@/components/ListSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { useFastMovingReport } from '@/hooks/use-reports';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId } from '@/lib/shop-scope';
import { extractApiError } from '@/lib/envelope';
import { Badge, Card, EmptyState, Muted, Screen, Subtitle } from '@/components/ui';
import { spacing } from '@/theme';

export default function StockMovementReportScreen() {
  const user = useAuthStore((s) => s.user);
  const shopId = defaultShopId(user);
  const query = useFastMovingReport(shopId || undefined);

  return (
    <PermissionGate permission="report:view">
      <Screen style={styles.screen}>
        {query.isLoading ? (
          <ListSkeleton />
        ) : query.isError ? (
          <ErrorState message={extractApiError(query.error) ?? 'Could not load stock movement.'} onRetry={() => query.refetch()} />
        ) : (
          <FlatList
            data={query.data ?? []}
            keyExtractor={(item, i) => `${item.productCode}-${i}`}
            refreshControl={
              <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
            }
            ListEmptyComponent={<EmptyState message="No movement in this period." icon="swap-horizontal-outline" />}
            renderItem={({ item }) => (
              <Card>
                <View style={styles.row}>
                  <Subtitle>{item.productCode}</Subtitle>
                  {item.isTopVelocity ? <Badge label="FAST" tone="success" /> : null}
                </View>
                <Muted>{item.description}</Muted>
                <View style={styles.metaRow}>
                  <Muted>{item.totalIssuedQty} issued (90d)</Muted>
                  <Muted>{item.velocity.toFixed(2)}/day</Muted>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, flexWrap: 'wrap' },
});
