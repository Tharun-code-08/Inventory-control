import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { SearchBar } from '@/components/SearchBar';
import { ListSkeleton } from '@/components/ListSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { StatusBadge } from '@/components/StatusBadge';
import { usePurchaseOrders, type POFilters } from '@/hooks/use-purchase-orders';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId } from '@/lib/shop-scope';
import { EmptyState, ListRow, Screen } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { spacing } from '@/theme';

const STATUS_TABS = ['ALL', 'DRAFT', 'CONFIRMED', 'CANCELLED'] as const;

export default function PurchaseOrdersScreen() {
  const user = useAuthStore((s) => s.user);
  const shopId = defaultShopId(user);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const filters: POFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      shopId: shopId || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      page,
      limit: 25,
    }),
    [search, shopId, statusFilter, page],
  );
  const query = usePurchaseOrders(filters);

  return (
    <PermissionGate permission="purchase_order:read">
      <Screen style={styles.screen}>
        <SearchBar placeholder="Search PO number or supplier…" onSearch={setSearch} />
        <View style={styles.tabs}>
          {STATUS_TABS.map((tab) => (
            <StatusBadge
              key={tab}
              status={tab === 'ALL' ? 'default' : tab}
              label={tab}
              onPress={() => { setStatusFilter(tab); setPage(1); }}
              active={statusFilter === tab}
            />
          ))}
        </View>
        {query.isLoading ? (
          <ListSkeleton />
        ) : query.isError ? (
          <ErrorState message="Could not load purchase orders." onRetry={() => query.refetch()} />
        ) : (
          <FlatList
            data={query.data?.items ?? []}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
            ListEmptyComponent={<EmptyState message="No purchase orders found." icon="document-text-outline" />}
            renderItem={({ item }) => (
              <Link href={`/purchase-orders/${item.id}`} asChild>
                <ListRow
                  title={`${item.poNumber} · ${item.supplier}`}
                  subtitle={`${formatDate(item.poDate)} · ${formatCurrency(item.totalValue)}`}
                  right={<StatusBadge status={item.status} />}
                />
              </Link>
            )}
          />
        )}
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
});
