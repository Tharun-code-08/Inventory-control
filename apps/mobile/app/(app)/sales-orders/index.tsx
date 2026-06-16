import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { SearchBar } from '@/components/SearchBar';
import { ListSkeleton } from '@/components/ListSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { StatusBadge } from '@/components/StatusBadge';
import { useSalesOrders, type SOFilters, type SalesOrderStatus } from '@/hooks/use-sales-orders';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId } from '@/lib/shop-scope';
import { EmptyState, ListRow, Screen } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { spacing } from '@/theme';

const STATUS_TABS = ['ALL', 'DRAFT', 'CONFIRMED', 'FULFILLED', 'CANCELLED'] as const;

export default function SalesOrdersScreen() {
  const user = useAuthStore((s) => s.user);
  const shopId = defaultShopId(user);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filters: SOFilters = useMemo(
    () => ({
      shopId: shopId || undefined,
      status: statusFilter === 'ALL' ? undefined : (statusFilter as SalesOrderStatus),
      take: 100,
    }),
    [shopId, statusFilter],
  );
  const query = useSalesOrders(filters);

  const items = useMemo(() => {
    const rows = query.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (o) =>
        o.soNumber.toLowerCase().includes(term) ||
        (o.customer?.customerName ?? '').toLowerCase().includes(term),
    );
  }, [query.data, search]);

  return (
    <PermissionGate permission="shop:read">
      <Screen style={styles.screen}>
        <SearchBar placeholder="Search SO number or customer…" onSearch={setSearch} />
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
          <ErrorState message="Could not load sales orders." onRetry={() => query.refetch()} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
            }
            ListEmptyComponent={<EmptyState message="No sales orders found." icon="cart-outline" />}
            renderItem={({ item }) => (
              <Link href={`/sales-orders/${item.id}`} asChild>
                <ListRow
                  title={`${item.soNumber} · ${item.customer?.customerName ?? 'Customer'}`}
                  subtitle={`${formatDate(item.orderDate)} · ${formatCurrency(item.totalValue)}`}
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
