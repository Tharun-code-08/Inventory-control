import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PermissionGate } from '@/components/PermissionGate';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { useCreateGoodsReceipt } from '@/hooks/use-goods-receipts';
import { useProducts, type Product } from '@/hooks/use-products';
import { useShops } from '@/hooks/use-shops';
import { useStorageLocations } from '@/hooks/use-storage-locations';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId, isShopOnlyUser } from '@/lib/shop-scope';
import { getApiErrorMessage } from '@/lib/api-error';
import { useDebounce } from '@/hooks/use-debounce';
import { api } from '@/api/client';
import { Button, Card, EmptyState, Input, Muted, Screen, Subtitle, Title, colors } from '@/components/ui';
import { spacing } from '@/theme';

type LineDraft = {
  productId: string;
  label: string;
  quantity: string;
  uom: string;
  purchaseRate: string;
  storageLocationId: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewGoodsReceiptScreen() {
  const user = useAuthStore((s) => s.user);
  const lockedShopId = defaultShopId(user);
  const [shopId, setShopId] = useState(lockedShopId);
  const [supplierName, setSupplierName] = useState('');
  const [supplierRef, setSupplierRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const debouncedProductSearch = useDebounce(productSearch, 350);
  const shopsQuery = useShops();
  const shops = useMemo(
    () => (shopsQuery.data ?? []).filter((s) => s.isActive),
    [shopsQuery.data],
  );
  const locationsQuery = useStorageLocations(shopId || undefined);
  const locations = useMemo(
    () => (locationsQuery.data ?? []).filter((l) => l.isActive),
    [locationsQuery.data],
  );
  const defaultLocationId = locations[0]?.id ?? '';

  const productsQuery = useProducts({
    shopId: shopId || undefined,
    isActive: true,
    search: debouncedProductSearch.trim() || undefined,
    limit: 30,
    page: 1,
  });
  const createGr = useCreateGoodsReceipt();

  useEffect(() => {
    if (lockedShopId) setShopId(lockedShopId);
  }, [lockedShopId]);

  function addLine(product: Pick<Product, 'id' | 'productCode' | 'description' | 'uom' | 'purchasePrice'>) {
    setScanError(null);
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        // Scanning the same product again bumps the quantity.
        return prev.map((l) =>
          l.productId === product.id
            ? { ...l, quantity: String((Number(l.quantity) || 0) + 1) }
            : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          label: `${product.productCode} — ${product.description}`,
          quantity: '1',
          uom: product.uom,
          purchaseRate: String(product.purchasePrice ?? 0),
          storageLocationId: defaultLocationId,
        },
      ];
    });
    setProductSearch('');
  }

  async function handleScanned(code: string) {
    try {
      const res = await api.get('/products', {
        params: {
          search: code,
          shop_id: shopId || undefined,
          is_active: true,
          limit: 10,
          page: 1,
        },
      });
      const payload = res.data?.data ?? res.data;
      const rows: Product[] = Array.isArray(payload)
        ? payload
        : (payload?.items ?? payload?.data ?? []);
      const match =
        rows.find((p) => p.productCode?.toLowerCase() === code.toLowerCase()) ?? rows[0];
      if (!match) {
        setScanError(`No product found for barcode "${code}".`);
        return;
      }
      addLine(match);
    } catch (e) {
      setScanError(getApiErrorMessage(e, 'Could not look up the scanned barcode.'));
    }
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  function updateLine(productId: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  async function onSave() {
    if (!shopId) {
      Alert.alert('Shop required', 'Select a shop.');
      return;
    }
    if (!supplierName.trim()) {
      Alert.alert('Supplier required', 'Enter the supplier name.');
      return;
    }
    if (locations.length === 0) {
      Alert.alert('No storage locations', 'This shop has no active storage locations. Create one on the web app first.');
      return;
    }
    const items = lines
      .map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        uom: l.uom,
        purchaseRate: Number(l.purchaseRate),
        storageLocationId: l.storageLocationId || defaultLocationId,
      }))
      .filter((l) => l.quantity > 0);
    if (items.length === 0) {
      Alert.alert('Lines required', 'Add at least one product line.');
      return;
    }
    if (items.some((l) => !Number.isFinite(l.purchaseRate) || l.purchaseRate < 0)) {
      Alert.alert('Invalid rate', 'Each line needs a purchase rate of 0 or more.');
      return;
    }
    try {
      const gr = await createGr.mutateAsync({
        grDate: todayISO(),
        shopId,
        receiptType: 'FULL',
        receiptSource: 'OUTSIDE',
        supplierName: supplierName.trim(),
        supplierRef: supplierRef.trim() || undefined,
        remarks: remarks.trim() || undefined,
        items,
      });
      router.replace(`/goods-receipts/${gr.id}`);
    } catch (err) {
      Alert.alert('Failed', getApiErrorMessage(err));
    }
  }

  return (
    <PermissionGate permission="goods_receipt:create">
      <Screen>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Title>New goods receipt</Title>

          {!isShopOnlyUser(user) ? (
            <Card>
              <Subtitle>Shop</Subtitle>
              {shops.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setShopId(s.id)}
                  style={[styles.chip, shopId === s.id && styles.chipActive]}
                >
                  <Text style={styles.chipText}>{s.shopName}</Text>
                </Pressable>
              ))}
            </Card>
          ) : null}

          <Input placeholder="Supplier name *" value={supplierName} onChangeText={setSupplierName} />
          <Input placeholder="Supplier reference (optional)" value={supplierRef} onChangeText={setSupplierRef} />
          <Input placeholder="Remarks (optional)" value={remarks} onChangeText={setRemarks} />

          <Subtitle>Lines ({lines.length})</Subtitle>
          {scanError ? <Muted style={styles.error}>{scanError}</Muted> : null}
          {lines.map((line) => (
            <Card key={line.productId}>
              <Muted>{line.label}</Muted>
              <View style={styles.lineRow}>
                <View style={styles.lineField}>
                  <Muted>Qty ({line.uom})</Muted>
                  <Input
                    keyboardType="decimal-pad"
                    value={line.quantity}
                    onChangeText={(q) => updateLine(line.productId, { quantity: q })}
                  />
                </View>
                <View style={styles.lineField}>
                  <Muted>Rate</Muted>
                  <Input
                    keyboardType="decimal-pad"
                    value={line.purchaseRate}
                    onChangeText={(r) => updateLine(line.productId, { purchaseRate: r })}
                  />
                </View>
              </View>
              {locations.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationsRow}>
                  {locations.map((loc) => (
                    <Pressable
                      key={loc.id}
                      onPress={() => updateLine(line.productId, { storageLocationId: loc.id })}
                      style={[
                        styles.chip,
                        (line.storageLocationId || defaultLocationId) === loc.id && styles.chipActive,
                      ]}
                    >
                      <Text style={styles.chipText}>{loc.name || loc.code}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              <Button label="Remove" variant="secondary" onPress={() => removeLine(line.productId)} />
            </Card>
          ))}

          <View style={styles.scanRow}>
            <Button
              label="Scan barcode"
              variant="secondary"
              onPress={() => {
                if (!shopId) {
                  Alert.alert('Shop required', 'Select a shop first.');
                  return;
                }
                setScanError(null);
                setScannerOpen(true);
              }}
            />
          </View>

          <Subtitle>Add product manually</Subtitle>
          <Input
            placeholder="Search products"
            value={productSearch}
            onChangeText={setProductSearch}
          />
          {!shopId ? (
            <EmptyState message="Select a shop first." />
          ) : productSearch.trim().length === 0 ? null : (productsQuery.data?.items ?? []).length === 0 ? (
            <EmptyState message={productsQuery.isLoading ? 'Loading…' : 'No products.'} />
          ) : (
            <View>
              {(productsQuery.data?.items ?? []).map((item) => (
                <Pressable key={item.id} onPress={() => addLine(item)} style={styles.productPick}>
                  <Text style={styles.productCode}>
                    <Ionicons name="cube-outline" size={14} color={colors.text} /> {item.productCode}
                  </Text>
                  <Muted>{item.description}</Muted>
                </Pressable>
              ))}
            </View>
          )}

          <Button label="Save draft" onPress={onSave} loading={createGr.isPending} />
        </ScrollView>

        <BarcodeScanner
          visible={scannerOpen}
          continuous
          title="Scan items to receive"
          onClose={() => setScannerOpen(false)}
          onScanned={(code) => {
            handleScanned(code);
            return false; // stay open; cooldown in the scanner prevents double-adds
          }}
        />
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: '#eef2ff' },
  chipText: { fontSize: 14, color: colors.text },
  error: { color: colors.danger, marginBottom: spacing.md },
  lineRow: { flexDirection: 'row', gap: spacing.md },
  lineField: { flex: 1 },
  locationsRow: { marginBottom: spacing.sm },
  scanRow: { marginBottom: spacing.md },
  productPick: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productCode: { color: colors.text, fontWeight: '600' },
});
