import { ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { useProduct, resolveProductStock } from '@/hooks/use-products';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId } from '@/lib/shop-scope';
import { getApiErrorMessage } from '@/lib/api-error';
import { Badge, Card, EmptyState, Muted, Screen, Subtitle, Title } from '@/components/ui';
import { formatCurrency } from '@/lib/format';

export default function ProductDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const user = useAuthStore((s) => s.user);
  const shopId = defaultShopId(user);
  const query = useProduct(id ?? '');

  const product = query.data;
  const stock = product ? resolveProductStock(product, shopId || undefined) : 0;

  return (
    <PermissionGate permission="product:read">
      <Screen>
        <ScrollView
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
        >
          {query.isError ? (
            <EmptyState message={getApiErrorMessage(query.error, 'Could not load product.')} />
          ) : query.isLoading || !product ? (
            <EmptyState message="Loading product…" />
          ) : (
            <>
              <Title>{product.productCode}</Title>
              <Muted>{product.description}</Muted>
              <Card>
                <Subtitle>Stock</Subtitle>
                <Badge label={`${stock} ${product.uom}`} tone={stock < 1 ? 'warning' : 'success'} />
                <Muted>Category: {product.category}</Muted>
                <Muted>Selling price: {formatCurrency(product.sellingPrice)}</Muted>
                <Muted>Purchase price: {formatCurrency(product.purchasePrice)}</Muted>
              </Card>
              {product.plants && product.plants.length > 0 ? (
                <Card>
                  <Subtitle>Plant thresholds</Subtitle>
                  {product.plants.map((p, i) => (
                    <Muted key={i}>
                      Shop {p.shopId.slice(0, 8)}… min {p.minStockLevel}
                    </Muted>
                  ))}
                </Card>
              ) : null}
            </>
          )}
        </ScrollView>
      </Screen>
    </PermissionGate>
  );
}
