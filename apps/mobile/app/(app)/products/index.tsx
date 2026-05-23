import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { useProducts } from '@/hooks/use-products';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId, isShopOnlyUser } from '@/lib/shop-scope';
import { getApiErrorMessage } from '@/lib/api-error';
import { EmptyState, Input, ListRow, Muted, Screen, Title } from '@/components/ui';

export default function ProductsScreen() {
  const user = useAuthStore((s) => s.user);
  const shopId = defaultShopId(user);
  const [search, setSearch] = useState('');
  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      shopId: shopId || undefined,
      isActive: true,
      limit: 50,
      page: 1,
    }),
    [search, shopId],
  );
  const query = useProducts(filters);
  const items = query.data?.items ?? [];

  const listHeader = (
    <>
      <Title>Products</Title>
      {isShopOnlyUser(user) && user?.shop?.shopName ? (
        <Input editable={false} value={user.shop.shopName} />
      ) : null}
      <Input
        placeholder="Search code or description"
        value={search}
        onChangeText={setSearch}
      />
      {query.isError ? (
        <Muted style={styles.error}>{getApiErrorMessage(query.error, 'Could not load products.')}</Muted>
      ) : null}
    </>
  );

  return (
    <PermissionGate permission="product:read">
      <Screen style={styles.screen}>
        <FlatList
          style={styles.list}
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              message={
                query.isLoading
                  ? 'Loading…'
                  : query.isError
                    ? 'Products could not be loaded.'
                    : 'No products found.'
              }
            />
          }
          renderItem={({ item }) => (
            <Link href={`/products/${item.id}`} asChild>
              <ListRow
                title={item.productCode}
                subtitle={`${item.description} · ${item.uom} · stock ${item.currentStock ?? item.totalStock ?? 0}`}
              />
            </Link>
          )}
        />
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  list: { flex: 1 },
  error: { color: '#dc2626', marginBottom: 8 },
});
