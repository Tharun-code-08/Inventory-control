import { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, View, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PermissionGate } from '@/components/PermissionGate';
import { useGoodsIssues } from '@/hooks/use-goods-issues';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { defaultShopId } from '@/lib/shop-scope';
import { Badge, EmptyState, ListRow, Screen, Title, colors } from '@/components/ui';

export default function GoodsIssuesScreen() {
  const user = useAuthStore((s) => s.user);
  const shopId = defaultShopId(user);
  const filters = useMemo(() => ({ shopId: shopId || undefined }), [shopId]);
  const query = useGoodsIssues(filters);
  const canCreate = hasPermission(user, 'goods_issue:create');

  return (
    <PermissionGate permission="goods_issue:read">
      <Screen style={{ paddingBottom: 0 }}>
        <Title>Goods issues</Title>
        <FlatList
          data={query.data ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
          }
          ListEmptyComponent={
            <EmptyState message={query.isLoading ? 'Loading…' : 'No goods issues.'} />
          }
          renderItem={({ item }) => (
            <Link href={`/goods-issues/${item.id}`} asChild>
              <ListRow
                title={item.giNumber}
                subtitle={`${item.shop?.shopName ?? ''} · ${item.issueReason}`}
                right={
                  <Badge
                    label={item.status}
                    tone={item.status === 'POSTED' ? 'success' : 'warning'}
                  />
                }
              />
            </Link>
          )}
        />
        {canCreate ? (
          <Pressable style={styles.fab} onPress={() => router.push('/goods-issues/new')}>
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        ) : null}
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
