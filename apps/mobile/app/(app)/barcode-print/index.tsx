import { useMemo, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { PermissionGate } from '@/components/PermissionGate';
import { useProducts, type Product } from '@/hooks/use-products';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId } from '@/lib/shop-scope';
import { getApiErrorMessage } from '@/lib/api-error';
import { useDebounce } from '@/hooks/use-debounce';
import { generateBarcode } from '@/lib/barcodeGenerator';
import { Button, Card, EmptyState, Input, Muted, Screen, Title } from '@/components/ui';
import { colors, spacing } from '@/theme';

type PendingAction = { productId: string; action: 'print' | 'share' } | null;

function labelHtml(product: Product, dataUrl: string) {
  return `<html><body style="margin:0;padding:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;font-family:sans-serif;">
    <div style="font-size:14px;margin-bottom:8px;">${product.description}</div>
    <img src="${dataUrl}" style="width:100%;max-width:300px;"/>
  </body></html>`;
}

export default function BarcodePrintScreen() {
  const user = useAuthStore((s) => s.user);
  const shopId = defaultShopId(user);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [pending, setPending] = useState<PendingAction>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      shopId: shopId || undefined,
      isActive: true,
      limit: 50,
      page: 1,
    }),
    [debouncedSearch, shopId],
  );
  const query = useProducts(filters);
  const items = query.data?.items ?? [];

  const getBarcode = async (product: Product) => {
    const cached = previews[product.id];
    if (cached) return cached;
    const dataUrl = await generateBarcode(product.productCode, 'code128');
    setPreviews((prev) => ({ ...prev, [product.id]: dataUrl }));
    return dataUrl;
  };

  const handlePrint = async (product: Product) => {
    setActionError(null);
    setPending({ productId: product.id, action: 'print' });
    try {
      const dataUrl = await getBarcode(product);
      await Print.printAsync({ html: labelHtml(product, dataUrl) });
    } catch (e) {
      setActionError(getApiErrorMessage(e, 'Could not print the label.'));
    } finally {
      setPending(null);
    }
  };

  const handleShare = async (product: Product) => {
    setActionError(null);
    setPending({ productId: product.id, action: 'share' });
    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device');
      }
      const dataUrl = await getBarcode(product);
      const base64 = dataUrl.split('base64,')[1];
      const uri = `${FileSystem.cacheDirectory}barcode-${product.productCode}.png`;
      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (e) {
      setActionError(getApiErrorMessage(e, 'Could not share the label.'));
    } finally {
      setPending(null);
    }
  };

  const listHeader = (
    <>
      <Title>Print Labels</Title>
      <Muted style={styles.hint}>Generate Code 128 labels from product codes.</Muted>
      <Input
        placeholder="Search code or description"
        value={search}
        onChangeText={setSearch}
      />
      {query.isError ? (
        <Muted style={styles.error}>{getApiErrorMessage(query.error, 'Could not load products.')}</Muted>
      ) : null}
      {actionError ? <Muted style={styles.error}>{actionError}</Muted> : null}
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
              icon="barcode-outline"
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
            <Card>
              <Title>{item.productCode}</Title>
              <Muted>{item.description}</Muted>
              {previews[item.id] ? (
                <Image
                  source={{ uri: previews[item.id] }}
                  style={styles.preview}
                  resizeMode="contain"
                />
              ) : null}
              <View style={styles.actions}>
                <View style={styles.actionButton}>
                  <Button
                    label="Print"
                    onPress={() => handlePrint(item)}
                    disabled={!!pending}
                    loading={pending?.productId === item.id && pending.action === 'print'}
                  />
                </View>
                <View style={styles.actionButton}>
                  <Button
                    label="Share"
                    variant="secondary"
                    onPress={() => handleShare(item)}
                    disabled={!!pending}
                    loading={pending?.productId === item.id && pending.action === 'share'}
                  />
                </View>
              </View>
            </Card>
          )}
        />
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  list: { flex: 1 },
  hint: { marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  preview: {
    width: '100%',
    height: 96,
    marginTop: spacing.sm,
    backgroundColor: '#fff',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: { flex: 1 },
});
