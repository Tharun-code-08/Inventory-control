import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { FAB } from '@/components/FAB';
import { hasPermission } from '@/lib/permissions';
import { ListSkeleton } from '@/components/ListSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { StatusBadge } from '@/components/StatusBadge';
import { useGoodsReceipts, type GRFilters } from '@/hooks/use-goods-receipts';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId } from '@/lib/shop-scope';
import { EmptyState, ListRow, Screen } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { spacing } from '@/theme';

const STATUS_TABS = ['ALL', 'DRAFT', 'POSTED', 'CANCELLED'] as const;

export default function GoodsReceiptsScreen() {
  const user = useAuthStore((s) => s.user);
  const shopId = defaultShopId(user);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filters: GRFilters = useMemo(
    () => ({
      shopId: shopId || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    }),
    [shopId, statusFilter],
  );
  const query = useGoodsReceipts(filters);

  return (
    <PermissionGate permission="goods_receipt:read">
      <Screen style={styles.screen}>
        <View style={styles.tabs}>
          {STATUS_TABS.map((tab) => (
            <StatusBadge
              key={tab}
              status={tab === 'ALL' ? 'default' : tab}
              label={tab}
              onPress={() => setStatusFilter(tab)}
              active={statusFilter === tab}
            />
          ))}
        </View>
        {query.isLoading ? (
          <ListSkeleton />
        ) : query.isError ? (
          <ErrorState message="Could not load goods receipts." onRetry={() => query.refetch()} />
        ) : (
          <FlatList
            data={query.data?.items ?? []}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
            ListEmptyComponent={<EmptyState message="No goods receipts found." icon="enter-outline" />}
            renderItem={({ item }) => (
              <Link href={`/goods-receipts/${item.id}`} asChild>
                <ListRow
                  title={`${item.grNumber} · ${item.supplierName}`}
                  subtitle={`${formatDate(item.grDate)} · ${item.receiptSource} · ${formatCurrency(item.totalValue)}`}
                  right={<StatusBadge status={item.status} />}
                />
              </Link>
            )}
          />
        )}
        {hasPermission(user, 'goods_receipt:create') ? (
          <FAB onPress={() => router.push('/goods-receipts/new')} />
        ) : null}
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
});
