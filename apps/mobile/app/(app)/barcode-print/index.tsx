import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { PermissionGate } from '@/components/PermissionGate';
import { QuantityStepper } from '@/components/QuantityStepper';
import { useProducts, type Product } from '@/hooks/use-products';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId } from '@/lib/shop-scope';
import { getApiErrorMessage } from '@/lib/api-error';
import { useDebounce } from '@/hooks/use-debounce';
import { generateBarcode } from '@/lib/barcodeGenerator';
import { formatCurrency } from '@/lib/format';
import {
  LABEL_SIZES,
  buildSheetHtml,
  labelsPerPage,
  pageCount,
  totalLabels,
  type LabelOptions,
  type LabelSizeKey,
  type QueueEntry,
} from '@/lib/labelSheet';
import { Button, Card, EmptyState, Input, Muted, Screen, Subtitle, Title, colors } from '@/components/ui';
import { spacing, typography } from '@/theme';

type PendingAction = 'print' | 'share' | null;

export default function BarcodePrintScreen() {
  const user = useAuthStore((s) => s.user);
  const shopId = defaultShopId(user);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [options, setOptions] = useState<LabelOptions>({
    size: 'small',
    showName: true,
    showBarcode: true,
    showPrice: true,
    showSku: false,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [barcodeCache, setBarcodeCache] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      shopId: shopId || undefined,
      isActive: true,
      limit: 20,
      page: 1,
    }),
    [debouncedSearch, shopId],
  );
  const query = useProducts(filters);
  const results = debouncedSearch.trim() ? (query.data?.items ?? []) : [];

  const labelTotal = totalLabels(queue);
  const pages = pageCount(queue, options.size);

  function addToQueue(product: Product) {
    setActionError(null);
    setQueue((prev) => {
      const existing = prev.find((e) => e.product.id === product.id);
      // Duplicate merge: adding an already-queued product bumps its quantity.
      if (existing) {
        return prev.map((e) =>
          e.product.id === product.id ? { ...e, quantity: e.quantity + 1 } : e,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSearch('');
  }

  function setQuantity(productId: string, quantity: number) {
    setQueue((prev) =>
      quantity <= 0
        ? prev.filter((e) => e.product.id !== productId)
        : prev.map((e) => (e.product.id === productId ? { ...e, quantity } : e)),
    );
  }

  /** Generate (and cache) one barcode image per queued product. */
  async function resolveBarcodes(): Promise<Record<string, string>> {
    const next = { ...barcodeCache };
    for (const entry of queue) {
      if (!next[entry.product.id]) {
        next[entry.product.id] = await generateBarcode(entry.product.productCode, 'code128');
      }
    }
    setBarcodeCache(next);
    return next;
  }

  async function buildHtml() {
    const barcodes = options.showBarcode ? await resolveBarcodes() : {};
    return buildSheetHtml(queue, barcodes, options, formatCurrency);
  }

  async function handlePrint() {
    setActionError(null);
    setPending('print');
    try {
      await Print.printAsync({ html: await buildHtml() });
    } catch (e) {
      setActionError(getApiErrorMessage(e, 'Could not print the sheet.'));
    } finally {
      setPending(null);
    }
  }

  async function handleSharePdf() {
    setActionError(null);
    setPending('share');
    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device');
      }
      const { uri } = await Print.printToFileAsync({ html: await buildHtml() });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (e) {
      setActionError(getApiErrorMessage(e, 'Could not create the PDF.'));
    } finally {
      setPending(null);
    }
  }

  async function togglePreview() {
    if (!previewOpen && options.showBarcode) {
      setPending('print');
      try {
        await resolveBarcodes();
      } catch (e) {
        setActionError(getApiErrorMessage(e, 'Could not generate barcodes.'));
      } finally {
        setPending(null);
      }
    }
    setPreviewOpen((v) => !v);
  }

  // First-page preview grid: same cols/rows as the printed sheet, scaled to screen.
  const size = LABEL_SIZES[options.size];
  const perPage = labelsPerPage(options.size);
  const previewCells = useMemo(() => {
    if (!previewOpen) return [];
    const cells: { key: string; product: Product }[] = [];
    outer: for (const entry of queue) {
      for (let i = 0; i < entry.quantity; i++) {
        if (cells.length >= perPage) break outer;
        cells.push({ key: `${entry.product.id}-${i}`, product: entry.product });
      }
    }
    return cells;
  }, [previewOpen, queue, perPage]);

  return (
    <PermissionGate permission="product:read">
      <Screen style={styles.screen}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Title>Print Labels</Title>
          <Muted style={styles.hint}>
            Add products to the queue, then print the whole sheet on A4.
          </Muted>

          <Input placeholder="Search code or description" value={search} onChangeText={setSearch} />
          {query.isError ? (
            <Muted style={styles.error}>{getApiErrorMessage(query.error, 'Could not load products.')}</Muted>
          ) : null}
          {debouncedSearch.trim() ? (
            results.length === 0 ? (
              <EmptyState
                icon="barcode-outline"
                message={query.isLoading || query.isFetching ? 'Loading…' : 'No products found.'}
              />
            ) : (
              results.map((item) => (
                <Pressable key={item.id} style={styles.resultRow} onPress={() => addToQueue(item)}>
                  <View style={styles.resultText}>
                    <Text style={styles.resultCode}>{item.productCode}</Text>
                    <Muted>{item.description}</Muted>
                  </View>
                  <Text style={styles.addLink}>+ Add</Text>
                </Pressable>
              ))
            )
          ) : null}

          <Subtitle>Print queue ({queue.length})</Subtitle>
          {queue.length === 0 ? (
            <EmptyState icon="print-outline" message="Queue is empty. Search and add products above." />
          ) : (
            queue.map((entry) => (
              <Card key={entry.product.id}>
                <Text style={styles.resultCode}>{entry.product.productCode}</Text>
                <Muted>{entry.product.description}</Muted>
                <View style={styles.queueRow}>
                  <QuantityStepper
                    value={entry.quantity}
                    onChange={(q) => setQuantity(entry.product.id, q)}
                    min={0}
                    max={999}
                  />
                  <Pressable onPress={() => setQuantity(entry.product.id, 0)} hitSlop={8}>
                    <Text style={styles.remove}>Remove</Text>
                  </Pressable>
                </View>
              </Card>
            ))
          )}

          {queue.length > 0 ? (
            <>
              <Card>
                <Subtitle>Label sheet</Subtitle>
                <View style={styles.sizeRow}>
                  {(Object.keys(LABEL_SIZES) as LabelSizeKey[]).map((key) => (
                    <Pressable
                      key={key}
                      onPress={() => setOptions((o) => ({ ...o, size: key }))}
                      style={[styles.chip, options.size === key && styles.chipActive]}
                    >
                      <Text style={styles.chipText}>{key}</Text>
                    </Pressable>
                  ))}
                </View>
                <Muted>{LABEL_SIZES[options.size].label}</Muted>

                {(
                  [
                    ['showName', 'Product name'],
                    ['showBarcode', 'Barcode'],
                    ['showPrice', 'Price'],
                    ['showSku', 'SKU (text)'],
                  ] as const
                ).map(([key, label]) => (
                  <View key={key} style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>{label}</Text>
                    <Switch
                      value={options[key]}
                      onValueChange={(v) => setOptions((o) => ({ ...o, [key]: v }))}
                    />
                  </View>
                ))}

                <Muted style={styles.totals}>
                  Total labels: {labelTotal} · {pages} A4 page{pages === 1 ? '' : 's'} ({perPage}/page)
                </Muted>
              </Card>

              <Button
                label={previewOpen ? 'Hide preview' : 'Preview sheet'}
                variant="secondary"
                onPress={togglePreview}
                disabled={!!pending}
              />

              {previewOpen ? (
                <Card>
                  <Muted>Page 1 of {pages}</Muted>
                  <View style={styles.previewSheet}>
                    {previewCells.map((cell) => (
                      <View
                        key={cell.key}
                        style={[styles.previewLabel, { width: `${100 / size.cols - 1}%` }]}
                      >
                        {options.showName ? (
                          <Text numberOfLines={1} style={styles.previewName}>
                            {cell.product.description}
                          </Text>
                        ) : null}
                        {options.showBarcode && barcodeCache[cell.product.id] ? (
                          <Image
                            source={{ uri: barcodeCache[cell.product.id] }}
                            style={styles.previewBarcode}
                            resizeMode="contain"
                          />
                        ) : null}
                        {options.showSku && !options.showBarcode ? (
                          <Text style={styles.previewPrice}>{cell.product.productCode}</Text>
                        ) : null}
                        {options.showPrice ? (
                          <Text style={styles.previewPrice}>
                            {formatCurrency(cell.product.sellingPrice)}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </Card>
              ) : null}

              {actionError ? <Muted style={styles.error}>{actionError}</Muted> : null}

              <Button
                label={`Print ${labelTotal} label${labelTotal === 1 ? '' : 's'}`}
                onPress={handlePrint}
                loading={pending === 'print'}
                disabled={!!pending}
              />
              <Button
                label="Share as PDF"
                variant="secondary"
                onPress={handleSharePdf}
                loading={pending === 'share'}
                disabled={!!pending}
              />
              <Button
                label="Clear queue"
                variant="secondary"
                onPress={() => {
                  setQueue([]);
                  setPreviewOpen(false);
                }}
                disabled={!!pending}
              />
            </>
          ) : null}
        </ScrollView>
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  hint: { marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultText: { flex: 1 },
  resultCode: { color: colors.text, fontWeight: '600' },
  addLink: { color: colors.primary, fontWeight: '600' },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  remove: { color: colors.danger, fontWeight: '500' },
  sizeRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: '#eef2ff' },
  chipText: { fontSize: 14, color: colors.text, textTransform: 'capitalize' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  toggleLabel: { fontSize: typography.size.md, color: colors.text },
  totals: { marginTop: spacing.sm },
  previewSheet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    marginTop: spacing.sm,
    backgroundColor: '#fff',
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewLabel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    minHeight: 48,
  },
  previewName: { fontSize: 8, color: colors.text, fontWeight: '600' },
  previewBarcode: { width: '95%', height: 26 },
  previewPrice: { fontSize: 8, color: colors.text, fontWeight: '700' },
});
