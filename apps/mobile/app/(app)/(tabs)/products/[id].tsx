import { ScrollView, RefreshControl, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { useProduct, resolveProductStock } from '@/hooks/use-products';
import { useProductBarcodes } from '@/hooks/use-barcodes';
import { useStockLedger } from '@/hooks/use-stock-ledger';
import { useShops } from '@/hooks/use-shops';
import { ProductImage } from '@/components/ProductImage';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId } from '@/lib/shop-scope';
import { hasPermission } from '@/lib/permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { Badge, Button, Card, EmptyState, Muted, Screen, Subtitle, Title } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import { spacing } from '@/theme';

export default function ProductDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const user = useAuthStore((s) => s.user);
  const shopId = defaultShopId(user);
  const query = useProduct(id ?? '');
  const barcodesQuery = useProductBarcodes(id ?? '');
  const barcodes = barcodesQuery.data ?? [];
  const shopsQuery = useShops();
  const canViewReports = hasPermission(user, 'report:view');
  const ledgerQuery = useStockLedger({ productId: canViewReports ? id : undefined });

  const product = query.data;
  const stock = product ? resolveProductStock(product, shopId || undefined) : 0;
  const shopNames = new Map((shopsQuery.data ?? []).map((s) => [s.id, s.shopName]));
  // Ledger arrives oldest-first; show the latest few movements.
  const movements = (ledgerQuery.data ?? []).slice(-10).reverse();
  const stockBreakdown = Object.entries(product?.stockByShop ?? {});

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
              <View style={styles.hero}>
                <ProductImage
                  uri={product.imageUrl ?? product.thumbnailUrl}
                  category={product.category}
                  size={96}
                  radius={12}
                />
                <View style={styles.heroText}>
                  <Title>{product.productCode}</Title>
                  <Muted>{product.description}</Muted>
                </View>
              </View>
              <Card>
                <Subtitle>Stock</Subtitle>
                <Badge label={`${stock} ${product.uom}`} tone={stock < 1 ? 'warning' : 'success'} />
                <Muted>Category: {product.category}</Muted>
                <Muted>Unit: {product.uom}</Muted>
                <Muted>Selling price: {formatCurrency(product.sellingPrice)}</Muted>
                <Muted>Purchase price: {formatCurrency(product.purchasePrice)}</Muted>
              </Card>
              {stockBreakdown.length > 0 ? (
                <Card>
                  <Subtitle>Stock by warehouse</Subtitle>
                  {stockBreakdown.map(([sid, qty]) => (
                    <View key={sid} style={styles.stockRow}>
                      <Muted>{shopNames.get(sid) ?? `${sid.slice(0, 8)}…`}</Muted>
                      <Badge label={`${qty} ${product.uom}`} tone={qty < 1 ? 'warning' : 'success'} />
                    </View>
                  ))}
                </Card>
              ) : null}
              <Card>
                <Subtitle>Barcodes</Subtitle>
                {barcodes.length === 0 ? (
                  <Muted>
                    {barcodesQuery.isLoading
                      ? 'Loading…'
                      : 'No barcodes registered. Scans match the product code as a fallback.'}
                  </Muted>
                ) : (
                  barcodes.map((b) => (
                    <View key={b.id} style={styles.barcodeRow}>
                      <Muted>{b.barcode}</Muted>
                      <View style={styles.barcodeBadges}>
                        <Badge label={b.barcodeType} />
                        {b.isPrimary ? <Badge label="PRIMARY" tone="primary" /> : null}
                        {b.supplier ? <Badge label={b.supplier.supplierName} tone="info" /> : null}
                      </View>
                    </View>
                  ))
                )}
                {hasPermission(user, 'product:write') ? (
                  <Button
                    label="Manage barcodes"
                    variant="secondary"
                    // Cast: typed routes regenerate on the next `expo start`.
                    onPress={() => router.push('/barcode-management' as Href)}
                  />
                ) : null}
              </Card>
              {product.plants && product.plants.length > 0 ? (
                <Card>
                  <Subtitle>Plant thresholds</Subtitle>
                  {product.plants.map((p, i) => (
                    <Muted key={i}>
                      {shopNames.get(p.shopId) ?? `Shop ${p.shopId.slice(0, 8)}…`} · min {p.minStockLevel}
                    </Muted>
                  ))}
                </Card>
              ) : null}
              {canViewReports ? (
                <Card>
                  <Subtitle>Recent movements</Subtitle>
                  {movements.length === 0 ? (
                    <Muted>
                      {ledgerQuery.isLoading ? 'Loading…' : 'No movements in the report window.'}
                    </Muted>
                  ) : (
                    movements.map((m) => (
                      <View key={m.id} style={styles.movementRow}>
                        <View style={styles.movementMain}>
                          <Muted>{`${m.transactionDate.slice(0, 10)} · ${m.transactionType}`}</Muted>
                          {m.referenceNumber ? <Muted>{m.referenceNumber}</Muted> : null}
                        </View>
                        <Badge
                          label={m.inQty > 0 ? `+${m.inQty}` : `-${m.outQty}`}
                          tone={m.inQty > 0 ? 'success' : 'danger'}
                        />
                        <Muted>{`bal ${m.balanceQty}`}</Muted>
                      </View>
                    ))
                  )}
                </Card>
              ) : null}
            </>
          )}
        </ScrollView>
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  heroText: { flex: 1 },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  movementMain: { flex: 1 },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  barcodeBadges: { flexDirection: 'row', gap: spacing.xs },
});
