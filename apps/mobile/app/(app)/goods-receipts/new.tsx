import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PermissionGate } from '@/components/PermissionGate';
import { ProductImage } from '@/components/ProductImage';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { UnknownBarcodeSheet } from '@/components/UnknownBarcodeSheet';
import { lookupBarcode } from '@/hooks/use-barcodes';
import { useCreateGoodsReceipt } from '@/hooks/use-goods-receipts';
import { usePurchaseOrder, usePurchaseOrders } from '@/hooks/use-purchase-orders';
import { useProducts, type Product } from '@/hooks/use-products';
import { useShops } from '@/hooks/use-shops';
import { useStorageLocations } from '@/hooks/use-storage-locations';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId, isShopOnlyUser } from '@/lib/shop-scope';
import { getApiErrorMessage } from '@/lib/api-error';
import { useDebounce } from '@/hooks/use-debounce';
import { Button, Card, EmptyState, Input, Muted, Screen, Subtitle, Title, colors } from '@/components/ui';
import { spacing } from '@/theme';

type LineDraft = {
  productId: string;
  label: string;
  quantity: string;
  uom: string;
  purchaseRate: string;
  storageLocationId: string;
  /** PO mode: how much is still receivable. Receiving more is blocked. */
  remainingQty?: number;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewGoodsReceiptScreen() {
  const user = useAuthStore((s) => s.user);
  const lockedShopId = defaultShopId(user);
  const { poId } = useLocalSearchParams<{ poId?: string }>();
  const poQuery = usePurchaseOrder(poId ?? '');
  const po = poId ? poQuery.data : undefined;
  const [shopId, setShopId] = useState(lockedShopId);
  const [supplierName, setSupplierName] = useState('');
  const [supplierRef, setSupplierRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannerStatus, setScannerStatus] = useState<{ message: string; tone: 'success' | 'error' | 'info' } | null>(null);
  const scannerStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [unknownBarcodePolicy, setUnknownBarcodePolicy] = useState<'AUTO_CREATE' | 'ASK' | 'REJECT' | null>(null);

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

  // Eligible POs for "receive against a purchase order" (blank mode only).
  const eligiblePosQuery = usePurchaseOrders(
    !poId && shopId ? { shopId, status: 'CONFIRMED', limit: 20 } : {},
  );
  const eligiblePos = useMemo(
    () =>
      poId || !shopId
        ? []
        : (eligiblePosQuery.data?.items ?? []).filter(
            (p) => p.lifecycleStatus === 'CONFIRMED' || p.lifecycleStatus === 'PARTIALLY_RECEIVED',
          ),
    [poId, shopId, eligiblePosQuery.data],
  );

  useEffect(() => {
    if (lockedShopId) setShopId(lockedShopId);
  }, [lockedShopId]);

  // PO mode: lock shop + supplier to the PO and prefill all open lines with
  // their pending quantities. Re-runs only when a different PO loads.
  useEffect(() => {
    if (!po) return;
    setShopId(po.shopId);
    setSupplierName(po.supplier);
    const progressByProduct = new Map(
      (po.receiptProgress ?? []).map((rp) => [rp.productId, rp]),
    );
    setLines(
      po.items
        .map((item): LineDraft | null => {
          const progress = progressByProduct.get(item.productId);
          const remaining = progress ? progress.remainingQty : item.orderQty;
          if (remaining <= 0) return null;
          return {
            productId: item.productId,
            label: `${item.product?.productCode ?? ''} — ${item.product?.description ?? item.lineDescription ?? ''}`,
            quantity: String(remaining),
            uom: (item.product as { uom?: string } | undefined)?.uom ?? 'UNIT',
            purchaseRate: String(item.rate ?? 0),
            storageLocationId: '',
            remainingQty: remaining,
          };
        })
        .filter((l): l is LineDraft => l !== null),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [po?.id]);

  const poReceivable =
    !po || po.lifecycleStatus === 'CONFIRMED' || po.lifecycleStatus === 'PARTIALLY_RECEIVED';

  function addLine(product: Pick<Product, 'id' | 'productCode' | 'description' | 'uom' | 'purchasePrice'>) {
    if (po && !lines.some((l) => l.productId === product.id)) {
      setScanError(`${product.productCode} is not on purchase order ${po.poNumber}.`);
      return;
    }
    setScanError(null);
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        // Scanning the same product again bumps the quantity (capped at the
        // PO's pending quantity when receiving against a PO).
        return prev.map((l) => {
          if (l.productId !== product.id) return l;
          const next = (Number(l.quantity) || 0) + 1;
          const capped = l.remainingQty != null ? Math.min(next, l.remainingQty) : next;
          return { ...l, quantity: String(capped) };
        });
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

  function flashScannerStatus(message: string, tone: 'success' | 'error' | 'info') {
    if (scannerStatusTimer.current) clearTimeout(scannerStatusTimer.current);
    setScannerStatus({ message, tone });
    scannerStatusTimer.current = setTimeout(() => setScannerStatus(null), 2500);
  }

  async function handleScanned(code: string) {
    try {
      const result = await lookupBarcode(code, shopId || undefined);
      // Server flags double-fired scans (same user + code in a short window):
      // the product still resolves, but we skip the quantity bump.
      if (result.duplicate) return;
      if (!result.found) {
        if (po) {
          // Show the error inside the scanner so it's visible while it stays open.
          flashScannerStatus(`Not on PO: "${result.barcode}"`, 'error');
          return;
        }
        // Hand off to the recovery sheet: create or link, then add the line.
        setScannerOpen(false);
        setUnknownBarcode(result.barcode);
        setUnknownBarcodePolicy(result.policy ?? 'ASK');
        return;
      }
      addLine(result.product);
      flashScannerStatus(`✓ ${result.product.productCode} added`, 'success');
    } catch (e) {
      // Close scanner so error is visible in the form.
      setScannerOpen(false);
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
    // Over-receive guard (PO mode). The server re-validates inside the
    // transaction; this just fails fast with a line-level message.
    const overLine = lines.find(
      (l) => l.remainingQty != null && Number(l.quantity) > l.remainingQty,
    );
    if (overLine) {
      Alert.alert(
        'Over-receiving blocked',
        `${overLine.label}: only ${overLine.remainingQty} pending on this purchase order.`,
      );
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
    // FULL only when every open PO line is received in full by this receipt.
    const receiptType: 'FULL' | 'PARTIAL' = !po
      ? 'FULL'
      : lines.every((l) => l.remainingQty == null || Number(l.quantity) === l.remainingQty)
        ? 'FULL'
        : 'PARTIAL';
    try {
      const gr = await createGr.mutateAsync({
        grDate: todayISO(),
        shopId,
        receiptType,
        receiptSource: po ? 'PURCHASE_ORDER' : 'OUTSIDE',
        purchaseOrderId: po?.id,
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
          <Title>{po ? `Receive against ${po.poNumber}` : 'New goods receipt'}</Title>

          {poId && poQuery.isLoading ? <Muted>Loading purchase order…</Muted> : null}
          {poId && poQuery.isError ? (
            <Muted style={styles.error}>
              {getApiErrorMessage(poQuery.error, 'Could not load the purchase order.')}
            </Muted>
          ) : null}
          {po && !poReceivable ? (
            <Muted style={styles.error}>
              This purchase order is {po.lifecycleStatus} — goods can only be received against
              CONFIRMED or PARTIALLY_RECEIVED orders.
            </Muted>
          ) : null}
          {po ? (
            <Card>
              <Subtitle>Purchase order</Subtitle>
              <Muted>{`${po.poNumber} · ${po.supplier}`}</Muted>
              <Muted>{`Shop: ${po.shop?.shopName ?? po.shopId}`}</Muted>
            </Card>
          ) : null}

          {!po && !isShopOnlyUser(user) ? (
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

          {!po && eligiblePos.length > 0 ? (
            <Card>
              <Subtitle>Receive against a purchase order</Subtitle>
              {eligiblePos.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.setParams({ poId: p.id })}
                  style={styles.productPick}
                >
                  <Text style={styles.productCode}>{p.poNumber}</Text>
                  <Muted>{`${p.supplier} · ${p.lifecycleStatus}`}</Muted>
                </Pressable>
              ))}
            </Card>
          ) : null}

          {!po ? (
            <Input placeholder="Supplier name *" value={supplierName} onChangeText={setSupplierName} />
          ) : null}
          <Input placeholder="Supplier reference (optional)" value={supplierRef} onChangeText={setSupplierRef} />
          <Input placeholder="Remarks (optional)" value={remarks} onChangeText={setRemarks} />

          <Subtitle>Lines ({lines.length})</Subtitle>
          {scanError ? <Muted style={styles.error}>{scanError}</Muted> : null}
          {lines.map((line) => (
            <Card key={line.productId}>
              <Muted>{line.label}</Muted>
              {line.remainingQty != null ? (
                <Muted>{`Pending on PO: ${line.remainingQty} ${line.uom}`}</Muted>
              ) : null}
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
                setScannerStatus(null);
                setScannerOpen(true);
              }}
            />
          </View>

          {!po ? (
            <>
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
                      <ProductImage uri={item.thumbnailUrl} category={item.category} size={36} />
                      <View style={styles.productPickText}>
                        <Text style={styles.productCode}>{item.productCode}</Text>
                        <Muted>{item.description}</Muted>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : null}

          <Button
            label="Save draft"
            onPress={onSave}
            loading={createGr.isPending}
            disabled={!poReceivable}
          />
        </ScrollView>

        <BarcodeScanner
          visible={scannerOpen}
          continuous
          title="Scan items to receive"
          statusMessage={scannerStatus?.message}
          statusTone={scannerStatus?.tone}
          onClose={() => setScannerOpen(false)}
          onScanned={async (code) => {
            await handleScanned(code);
            return false; // stay open; scanner lock + cooldown prevent double-adds
          }}
        />

        <UnknownBarcodeSheet
          barcode={unknownBarcode}
          policy={unknownBarcodePolicy}
          shopId={shopId}
          onClose={() => {
            setUnknownBarcode(null);
            setUnknownBarcodePolicy(null);
          }}
          onResolved={(product) => {
            setUnknownBarcode(null);
            setUnknownBarcodePolicy(null);
            addLine(product);
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPickText: { flex: 1, marginLeft: spacing.md },
  productCode: { color: colors.text, fontWeight: '600' },
});
