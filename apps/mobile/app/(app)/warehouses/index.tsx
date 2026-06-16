import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Link, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PermissionGate } from '@/components/PermissionGate';
import { useShops } from '@/hooks/use-shops';
import { Badge, EmptyState, ListRow, Screen } from '@/components/ui';
import { colors } from '@/theme';

export default function WarehousesScreen() {
  const query = useShops();
  const shops = query.data ?? [];

  return (
    <PermissionGate permission="shop:read">
      <Screen style={styles.screen}>
        <FlatList
          data={shops}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="business-outline"
              message={query.isLoading ? 'Loading…' : 'No warehouses found.'}
            />
          }
          renderItem={({ item }) => (
            <Link href={`/warehouses/${item.id}` as Href} asChild>
              <ListRow
                title={item.shopName}
                subtitle={`#${item.shopNumber}`}
                left={<Ionicons name="business-outline" size={28} color={colors.primary} />}
                right={
                  item.isActive ? (
                    <Badge label="ACTIVE" tone="success" />
                  ) : (
                    <Badge label="INACTIVE" tone="danger" />
                  )
                }
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
});
