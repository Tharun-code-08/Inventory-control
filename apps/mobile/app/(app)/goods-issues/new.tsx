import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { useCreateGoodsIssue } from '@/hooks/use-goods-issues';
import { useProducts } from '@/hooks/use-products';
import { useShops } from '@/hooks/use-shops';
import { useAuthStore } from '@/store/authStore';
import { defaultShopId, isShopOnlyUser } from '@/lib/shop-scope';
import { getApiErrorMessage } from '@/lib/api-error';
import { Button, Card, EmptyState, Input, Muted, Screen, Subtitle, Title, colors } from '@/components/ui';

const ISSUE_REASONS = ['Sales Order', 'Production', 'Maintenance', 'Transfer', 'Damage'];

type LineDraft = { productId: string; label: string; quantity: string; uom: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewGoodsIssueScreen() {
  const user = useAuthStore((s) => s.user);
  const lockedShopId = defaultShopId(user);
  const [shopId, setShopId] = useState(lockedShopId);
  const [issueReason, setIssueReason] = useState(ISSUE_REASONS[0]);
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const shopsQuery = useShops();
  const shops = useMemo(
    () => (shopsQuery.data ?? []).filter((s) => s.isActive),
    [shopsQuery.data],
  );
  const productsQuery = useProducts({
    shopId: shopId || undefined,
    isActive: true,
    search: productSearch.trim() || undefined,
    limit: 30,
    page: 1,
  });
  const createGi = useCreateGoodsIssue();

  useEffect(() => {
    if (lockedShopId) setShopId(lockedShopId);
  }, [lockedShopId]);

  function addLine(product: { id: string; productCode: string; description: string; uom: string }) {
    if (lines.some((l) => l.productId === product.id)) return;
    setLines((prev) => [
      ...prev,
      {
        productId: product.id,
        label: `${product.productCode} — ${product.description}`,
        quantity: '1',
        uom: product.uom,
      },
    ]);
    setProductSearch('');
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  async function onSave() {
    if (!shopId) {
      Alert.alert('Shop required', 'Select a shop.');
      return;
    }
    const items = lines
      .map((l) => ({ productId: l.productId, quantity: Number(l.quantity), uom: l.uom }))
      .filter((l) => l.quantity > 0);
    if (items.length === 0) {
      Alert.alert('Lines required', 'Add at least one product line.');
      return;
    }
    try {
      const gi = await createGi.mutateAsync({
        giDate: todayISO(),
        shopId,
        issueReason,
        remarks: remarks.trim() || undefined,
        items,
      });
      router.replace(`/goods-issues/${gi.id}`);
    } catch (err) {
      Alert.alert('Failed', getApiErrorMessage(err));
    }
  }

  return (
    <PermissionGate permission="goods_issue:create">
      <Screen>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Title>New goods issue</Title>

          {!isShopOnlyUser(user) ? (
            <Card>
              <Subtitle>Shop</Subtitle>
              {shops.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setShopId(s.id)}
                  style={[styles.shopChip, shopId === s.id && styles.shopChipActive]}
                >
                  <Text style={styles.shopChipText}>{s.shopName}</Text>
                </Pressable>
              ))}
            </Card>
          ) : null}

          <Subtitle>Issue reason</Subtitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {ISSUE_REASONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => setIssueReason(r)}
                style={[styles.shopChip, issueReason === r && styles.shopChipActive]}
              >
                <Text style={styles.shopChipText}>{r}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Input placeholder="Remarks (optional)" value={remarks} onChangeText={setRemarks} />

          <Subtitle>Lines ({lines.length})</Subtitle>
          {lines.map((line) => (
            <Card key={line.productId}>
              <Muted>{line.label}</Muted>
              <Input
                keyboardType="decimal-pad"
                value={line.quantity}
                onChangeText={(q) =>
                  setLines((prev) =>
                    prev.map((l) => (l.productId === line.productId ? { ...l, quantity: q } : l)),
                  )
                }
              />
              <Button label="Remove" variant="secondary" onPress={() => removeLine(line.productId)} />
            </Card>
          ))}

          <Subtitle>Add product</Subtitle>
          <Input
            placeholder="Search products"
            value={productSearch}
            onChangeText={setProductSearch}
          />
          {!shopId ? (
            <EmptyState message="Select a shop first." />
          ) : (
            <FlatList
              scrollEnabled={false}
              data={productsQuery.data?.items ?? []}
              keyExtractor={(p) => p.id}
              ListEmptyComponent={<EmptyState message="No products." />}
              renderItem={({ item }) => (
                <Pressable onPress={() => addLine(item)} style={styles.productPick}>
                  <Text>{item.productCode}</Text>
                  <Muted>{item.description}</Muted>
                </Pressable>
              )}
            />
          )}

          <Button label="Save draft" onPress={onSave} loading={createGi.isPending} />
        </ScrollView>
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  shopChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  shopChipActive: { borderColor: colors.primary, backgroundColor: '#eef2ff' },
  shopChipText: { fontSize: 14, color: colors.text },
  productPick: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
