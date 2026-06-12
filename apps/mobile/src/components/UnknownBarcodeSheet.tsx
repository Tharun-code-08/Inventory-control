import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLinkBarcode, useQuickCreateProduct, useMarkInvalid, type ScannedProduct } from '@/hooks/use-barcodes';
import { useProducts, type Product } from '@/hooks/use-products';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { Button, EmptyState, Input, Muted, Subtitle } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

type Mode = 'menu' | 'link' | 'create';

type Props = {
  /** The scanned code that didn't match any product; null hides the sheet. */
  barcode: string | null;
  /** The company settings policy for handling unregistered scans. */
  policy: 'AUTO_CREATE' | 'ASK' | 'REJECT' | null;
  shopId: string;
  onClose: () => void;
  /** Called once the barcode resolves to a product (created or linked). */
  onResolved: (product: ScannedProduct) => void;
};

/** Product codes must match the API's ^[A-Z0-9_-]{1,40}$ rule. */
function suggestProductCode(barcode: string) {
  return barcode.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);
}

export function UnknownBarcodeSheet({ barcode, policy, shopId, onClose, onResolved }: Props) {
  const user = useAuthStore((s) => s.user);
  const canWrite = hasPermission(user, 'product:write');
  const [mode, setMode] = useState<Mode>('menu');
  const [error, setError] = useState<string | null>(null);

  // Link mode
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  // Create mode
  const [productCode, setProductCode] = useState('');
  const [description, setDescription] = useState('');
  const [uom, setUom] = useState('UNIT');
  const [category, setCategory] = useState('GENERAL');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');

  const linkBarcode = useLinkBarcode();
  const createProduct = useQuickCreateProduct();
  const markInvalid = useMarkInvalid();
  const busy = linkBarcode.isPending || createProduct.isPending || markInvalid.isPending;

  const productsQuery = useProducts({
    shopId: shopId || undefined,
    isActive: true,
    search: debouncedSearch.trim() || undefined,
    limit: 20,
    page: 1,
  });
  const candidates = useMemo(
    () => (mode === 'link' ? (productsQuery.data?.items ?? []) : []),
    [mode, productsQuery.data],
  );

  // Reset everything each time a new unknown barcode comes in.
  useEffect(() => {
    if (barcode) {
      setError(null);
      setSearch('');
      setProductCode(suggestProductCode(barcode));
      setDescription('');
      setUom('UNIT');
      setCategory('GENERAL');
      setPurchasePrice('0');
      setSellingPrice('0');

      if (policy === 'AUTO_CREATE') {
        setMode('create');
      } else {
        setMode('menu');
      }
    }
  }, [barcode, policy]);

  async function linkTo(product: Product) {
    if (!barcode) return;
    Alert.alert('Link barcode', `Add barcode ${barcode} to ${product.description}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Link',
        onPress: async () => {
          try {
            await linkBarcode.mutateAsync({ productId: product.id, barcode });
            onResolved(product);
          } catch (e) {
            setError(getApiErrorMessage(e, 'Could not link the barcode.'));
          }
        },
      },
    ]);
  }

  async function onCreate() {
    if (!barcode) return;
    const code = suggestProductCode(productCode);
    if (!code) {
      setError('Product code is required (letters, numbers, - and _).');
      return;
    }
    if (description.trim().length < 2) {
      setError('Description must be at least 2 characters.');
      return;
    }
    const pPrice = Number(purchasePrice);
    const sPrice = Number(sellingPrice);
    if (!Number.isFinite(pPrice) || pPrice < 0 || !Number.isFinite(sPrice) || sPrice < 0) {
      setError('Prices must be 0 or more.');
      return;
    }
    setError(null);
    try {
      const product = await createProduct.mutateAsync({
        productCode: code,
        description: description.trim(),
        uom: uom.trim() || 'UNIT',
        category: category.trim() || 'GENERAL',
        purchasePrice: pPrice,
        sellingPrice: sPrice,
        shopId,
      });
      // Register the scanned code against the new product unless it already
      // equals the product code (lookup falls back to productCode matches).
      if (barcode !== code) {
        try {
          await linkBarcode.mutateAsync({ productId: product.id, barcode });
        } catch {
          // Product exists either way; lookup still resolves via productCode
          // only if codes match, so surface a soft warning.
          Alert.alert('Note', 'Product created, but the barcode could not be registered to it.');
        }
      }
      onResolved(product);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Could not create the product.'));
    }
  }

  return (
    <Modal visible={!!barcode} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Ionicons name="help-circle-outline" size={22} color={colors.warning} />
            <Text style={styles.title}>
              {policy === 'REJECT' ? 'Barcode not allowed' : 'Barcode not found'}
            </Text>
          </View>
          <Text style={styles.code}>{barcode}</Text>
          {error ? <Muted style={styles.error}>{error}</Muted> : null}

          {policy === 'REJECT' ? (
            <View style={styles.menu}>
              <Text style={styles.policyWarning}>
                This barcode is not registered. Registration of unknown barcodes is disabled by company policy.
              </Text>
              <Button label="Close" onPress={onClose} />
            </View>
          ) : mode === 'menu' ? (
            <View style={styles.menu}>
              {canWrite ? (
                <>
                  <Button label="Create new product" onPress={() => setMode('create')} />
                  <Button label="Link to existing product" variant="secondary" onPress={() => setMode('link')} />
                </>
              ) : (
                <Muted>
                  No product matches this barcode, and your role cannot create or link products.
                </Muted>
              )}
              <Button
                label="Mark as invalid"
                variant="secondary"
                loading={markInvalid.isPending}
                onPress={async () => {
                  try {
                    await markInvalid.mutateAsync({ code: barcode!, shopId });
                    Alert.alert('Logged', 'Barcode has been marked as invalid.');
                    onClose();
                  } catch (e) {
                    setError(getApiErrorMessage(e, 'Could not log invalid barcode.'));
                  }
                }}
              />
              <Button label="Cancel" variant="secondary" onPress={onClose} />
            </View>
          ) : null}

          {mode === 'link' ? (
            <View style={styles.body}>
              <Subtitle>Link to existing product</Subtitle>
              <Input placeholder="Search products" value={search} onChangeText={setSearch} autoFocus />
              <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
                {candidates.length === 0 ? (
                  <EmptyState
                    message={productsQuery.isLoading ? 'Loading…' : 'No products found.'}
                  />
                ) : (
                  candidates.map((p) => (
                    <Pressable
                      key={p.id}
                      style={styles.resultRow}
                      onPress={() => linkTo(p)}
                      disabled={busy}
                    >
                      <Text style={styles.resultCode}>{p.productCode}</Text>
                      <Muted>{p.description}</Muted>
                    </Pressable>
                  ))
                )}
              </ScrollView>
              <Button label="Back" variant="secondary" onPress={() => setMode('menu')} disabled={busy} />
            </View>
          ) : null}

          {mode === 'create' ? (
            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
              <Subtitle>Create new product</Subtitle>
              <Muted>Product code</Muted>
              <Input value={productCode} onChangeText={setProductCode} autoCapitalize="characters" />
              <Muted>Description</Muted>
              <Input placeholder="e.g. Coca Cola 500ml" value={description} onChangeText={setDescription} />
              <View style={styles.row}>
                <View style={styles.field}>
                  <Muted>UOM</Muted>
                  <Input value={uom} onChangeText={setUom} autoCapitalize="characters" />
                </View>
                <View style={styles.field}>
                  <Muted>Category</Muted>
                  <Input value={category} onChangeText={setCategory} />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.field}>
                  <Muted>Purchase price</Muted>
                  <Input keyboardType="decimal-pad" value={purchasePrice} onChangeText={setPurchasePrice} />
                </View>
                <View style={styles.field}>
                  <Muted>Selling price</Muted>
                  <Input keyboardType="decimal-pad" value={sellingPrice} onChangeText={setSellingPrice} />
                </View>
              </View>
              <Button label="Save product" onPress={onCreate} loading={busy} />
              <Button label="Back" variant="secondary" onPress={() => setMode('menu')} disabled={busy} />
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.base,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold as '600',
    color: colors.text,
  },
  code: {
    fontSize: typography.size.md,
    color: colors.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  error: { color: colors.danger, marginBottom: spacing.sm },
  menu: { gap: spacing.sm },
  body: { maxHeight: 480 },
  results: { maxHeight: 260, marginBottom: spacing.sm },
  resultRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultCode: { color: colors.text, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.md },
  field: { flex: 1 },
  policyWarning: {
    fontSize: typography.size.sm,
    color: colors.text,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
});
