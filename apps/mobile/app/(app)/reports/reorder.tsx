import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { PermissionGate } from '@/components/PermissionGate';
import { ListSkeleton } from '@/components/ListSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { useReorderReport, type ReorderItem } from '@/hooks/use-reports';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId } from '@/lib/shop-scope';
import { extractApiError } from '@/lib/envelope';
import { Badge, Card, EmptyState, Muted, Screen, Subtitle } from '@/components/ui';
import { spacing } from '@/theme';

function urgencyTone(u: ReorderItem['urgency']) {
  return u === 'HIGH' ? 'danger' : u === 'MEDIUM' ? 'warning' : 'default';
}

export default function ReorderReportScreen() {
  const user = useAuthStore((s) => s.user);
  const shopId = defaultShopId(user);
  const query = useReorderReport(shopId || undefined);

  return (
    <PermissionGate permission="report:view">
      <Screen style={styles.screen}>
        {query.isLoading ? (
          <ListSkeleton />
        ) : query.isError ? (
          <ErrorState message={extractApiError(query.error) ?? 'Could not load reorder report.'} onRetry={() => query.refetch()} />
        ) : (
          <FlatList
            data={query.data ?? []}
            keyExtractor={(item) => item.productId}
            refreshControl={
              <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
            }
            ListEmptyComponent={<EmptyState message="Nothing to reorder right now." icon="cube-outline" />}
            renderItem={({ item }) => (
              <Card>
                <View style={styles.row}>
                  <Subtitle>{item.productCode}</Subtitle>
                  <Badge label={item.urgency} tone={urgencyTone(item.urgency)} />
                </View>
                <Muted>{item.name}</Muted>
                <View style={styles.metaRow}>
                  <Muted>{item.currentStock} in stock · {item.daysRemaining}d left</Muted>
                  <Muted>Order {item.suggestedOrderQty}</Muted>
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
