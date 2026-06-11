import { Alert, ScrollView, RefreshControl, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { StatusBadge } from '@/components/StatusBadge';
import { DetailField } from '@/components/DetailField';
import { SectionHeader } from '@/components/SectionHeader';
import { AuditInfo } from '@/components/AuditInfo';
import { DetailSkeleton } from '@/components/DetailSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { useGoodsReceipt, usePostGoodsReceipt } from '@/hooks/use-goods-receipts';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button, Card, Muted, Screen, Title } from '@/components/ui';
import { spacing } from '@/theme';

export default function GoodsReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const query = useGoodsReceipt(id ?? '');
  const postGr = usePostGoodsReceipt();
  const canPost = hasPermission(user, 'goods_receipt:create');
  const gr = query.data;

  function onPost() {
    if (!id) return;
    Alert.alert('Post Goods Receipt', 'This will add stock. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Post',
        onPress: async () => {
          try {
            await postGr.mutateAsync(id);
          } catch (err) {
            Alert.alert('Failed', getApiErrorMessage(err));
          }
        },
      },
    ]);
  }

  return (
    <PermissionGate permission="goods_receipt:read">
      <Screen>
        <ScrollView refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}>
          {query.isLoading ? (
            <DetailSkeleton />
          ) : query.isError ? (
            <ErrorState message={getApiErrorMessage(query.error, 'Could not load goods receipt.')} onRetry={() => query.refetch()} />
          ) : !gr ? (
            <ErrorState message="Goods receipt not found." />
          ) : (
            <>
              <Title>{gr.grNumber}</Title>
              <View style={styles.badgeRow}>
                <StatusBadge status={gr.status} />
              </View>

              <Card>
                <DetailField label="Supplier" value={gr.supplierName} />
                <DetailField label="GR Date" value={formatDate(gr.grDate)} />
                <DetailField label="Shop" value={gr.shop?.shopName ?? gr.shopId} />
                <DetailField label="Receipt Type" value={gr.receiptType} />
                <DetailField label="Source" value={gr.receiptSource} />
                <DetailField label="Total Value" value={formatCurrency(gr.totalValue)} />
                {gr.supplierRef ? <DetailField label="Supplier Ref" value={gr.supplierRef} /> : null}
                {gr.remarks ? <DetailField label="Remarks" value={gr.remarks} /> : null}
                {gr.postedAt ? <DetailField label="Posted" value={formatDate(gr.postedAt)} /> : null}
              </Card>

              <SectionHeader title="Lines" count={gr.items.length} icon="list-outline" />
              {gr.items.map((item) => (
                <Card key={item.id}>
                  <Muted>{item.product.productCode}</Muted>
                  <Muted>{item.product.description}</Muted>
                  <DetailField label="Qty" value={`${item.quantity} ${item.uom}`} />
                  <DetailField label="Rate" value={formatCurrency(item.purchaseRate)} />
                  <DetailField label="Value" value={formatCurrency(item.lineValue)} />
                  {item.batchNumber ? <DetailField label="Batch" value={item.batchNumber} /> : null}
                </Card>
              ))}

              <AuditInfo createdAt={gr.createdAt} updatedAt={gr.updatedAt} />

              {gr.status === 'DRAFT' && canPost ? (
                <View style={styles.actions}>
                  <Button label="Post Receipt" onPress={onPost} loading={postGr.isPending} />
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing['2xl'] },
});
