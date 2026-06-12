import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { useShops } from '@/hooks/use-shops';
import { useStorageLocations } from '@/hooks/use-storage-locations';
import { useStockLedger } from '@/hooks/use-stock-ledger';
import { useStockTransfers, useWarehouseInventory } from '@/hooks/use-warehouse';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge, Card, EmptyState, ListRow, Muted, Screen, Title } from '@/components/ui';
import { colors, spacing } from '@/theme';

const TABS = ['Stock', 'Bins', 'Transfers', 'Movements'] as const;
type Tab = (typeof TABS)[number];

export default function WarehouseDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) ?? '';
  const user = useAuthStore((s) => s.user);
  const canViewReports = hasPermission(user, 'report:view');
  const [tab, setTab] = useState<Tab>(canViewReports ? 'Stock' : 'Bins');

  const shopsQuery = useShops();
  const shop = (shopsQuery.data ?? []).find((s) => s.id === id);

  const inventoryQuery = useWarehouseInventory(
    canViewReports && tab === 'Stock' ? id : undefined,
  );
  const binsQuery = useStorageLocations(tab === 'Bins' ? id : undefined);
  const transfersQuery = useStockTransfers(tab === 'Transfers' ? id : undefined);
  const ledgerQuery = useStockLedger({
    shopId: canViewReports && tab === 'Movements' ? id : undefined,
  });

  const visibleTabs = useMemo(
    () => TABS.filter((t) => canViewReports || (t !== 'Stock' && t !== 'Movements')),
    [canViewReports],
  );

  const stock = inventoryQuery.data ?? [];
  const lowCount = stock.filter(
    (r) => r.minStockLevel > 0 && r.currentStock <= r.minStockLevel,
  ).length;
  const movements = useMemo(
    () => [...(ledgerQuery.data ?? [])].reverse().slice(0, 50),
    [ledgerQuery.data],
  );

  const header = (
    <>
      <Title>{shop?.shopName ?? 'Warehouse'}</Title>
      {shop ? <Muted>{`#${shop.shopNumber}`}</Muted> : null}
      {canViewReports && tab === 'Stock' ? (
        <Card>
          <View style={styles.kpiRow}>
            <View style={styles.kpi}>
              <Text style={styles.kpiValue}>{stock.length}</Text>
              <Muted>SKUs</Muted>
            </View>
            <View style={styles.kpi}>
              <Text style={[styles.kpiValue, lowCount > 0 && styles.kpiWarn]}>{lowCount}</Text>
              <Muted>Low stock</Muted>
            </View>
          </View>
        </Card>
      ) : null}
      <View style={styles.tabs}>
        {visibleTabs.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabChip, tab === t && styles.tabChipActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );

  function renderBody() {
    switch (tab) {
      case 'Stock':
        return {
          data: stock,
          loading: inventoryQuery.isLoading,
          refetch: () => inventoryQuery.refetch(),
          fetching: inventoryQuery.isFetching,
          empty: 'No stock assignments at this warehouse.',
          render: (item: (typeof stock)[number]) => (
            <ListRow
              title={item.productCode}
              subtitle={item.description}
              right={
                <Badge
                  label={`${item.currentStock}`}
                  tone={
                    item.minStockLevel > 0 && item.currentStock <= item.minStockLevel
                      ? 'warning'
                      : 'success'
                  }
                />
              }
            />
          ),
        };
      case 'Bins': {
        const bins = binsQuery.data ?? [];
        return {
          data: bins,
          loading: binsQuery.isLoading,
          refetch: () => binsQuery.refetch(),
          fetching: binsQuery.isFetching,
          empty: 'No bin locations configured.',
          render: (item: (typeof bins)[number]) => (
            <ListRow
              title={item.code}
              subtitle={item.name}
              right={item.isActive ? <Badge label="ACTIVE" tone="success" /> : <Badge label="INACTIVE" tone="danger" />}
            />
          ),
        };
      }
      case 'Transfers': {
        const transfers = transfersQuery.data ?? [];
        return {
          data: transfers,
          loading: transfersQuery.isLoading,
          refetch: () => transfersQuery.refetch(),
          fetching: transfersQuery.isFetching,
          empty: 'No transfers touching this warehouse.',
          render: (item: (typeof transfers)[number]) => (
            <ListRow
              title={item.transferNumber}
              subtitle={`${item.transferDate} · ${item.fromShop?.shopName ?? '?'} → ${item.toShop?.shopName ?? '?'}`}
              right={<StatusBadge status={item.status} />}
            />
          ),
        };
      }
      case 'Movements':
        return {
          data: movements,
          loading: ledgerQuery.isLoading,
          refetch: () => ledgerQuery.refetch(),
          fetching: ledgerQuery.isFetching,
          empty: 'No movements in the report window.',
          render: (item: (typeof movements)[number]) => (
            <ListRow
              title={`${item.productCode} · ${item.transactionType}`}
              subtitle={`${item.transactionDate.slice(0, 10)}${item.referenceNumber ? ` · ${item.referenceNumber}` : ''}`}
              right={
                <Badge
                  label={item.inQty > 0 ? `+${item.inQty}` : `-${item.outQty}`}
                  tone={item.inQty > 0 ? 'success' : 'danger'}
                />
              }
            />
          ),
        };
    }
  }

  const body = renderBody();

  return (
    <PermissionGate permission="shop:read">
      <Screen style={styles.screen}>
        <FlatList
          data={body.data as Array<{ id: string }>}
          keyExtractor={(item) => item.id ?? JSON.stringify(item)}
          refreshControl={
            <RefreshControl refreshing={body.fetching} onRefresh={body.refetch} />
          }
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState message={body.loading ? 'Loading…' : body.empty} />
          }
          renderItem={({ item }) => (body.render as (i: unknown) => React.ReactElement)(item)}
        />
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  kpiRow: { flexDirection: 'row', gap: spacing.xl },
  kpi: { alignItems: 'center' },
  kpiValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  kpiWarn: { color: colors.warning },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md, flexWrap: 'wrap' },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabChipActive: { borderColor: colors.primary, backgroundColor: '#eef2ff' },
  tabText: { fontSize: 14, color: colors.muted },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
});
