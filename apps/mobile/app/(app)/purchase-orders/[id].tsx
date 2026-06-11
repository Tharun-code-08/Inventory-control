import { Alert, ScrollView, RefreshControl, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { StatusBadge } from '@/components/StatusBadge';
import { DetailField } from '@/components/DetailField';
import { SectionHeader } from '@/components/SectionHeader';
import { AuditInfo } from '@/components/AuditInfo';
import { DetailSkeleton } from '@/components/DetailSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { PdfDownloadButton } from '@/components/PdfDownloadButton';
import { usePurchaseOrder, useConfirmPO, useCancelPO } from '@/hooks/use-purchase-orders';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button, Card, Muted, Screen, Title } from '@/components/ui';
import { spacing } from '@/theme';

export default function PurchaseOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const query = usePurchaseOrder(id ?? '');
  const confirmPO = useConfirmPO();
  const cancelPO = useCancelPO();
  const canWrite = hasPermission(user, 'purchase_order:create');
  const po = query.data;

  function onConfirm() {
    if (!id) return;
    Alert.alert('Confirm PO', 'Mark this purchase order as confirmed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await confirmPO.mutateAsync(id);
          } catch (err) {
            Alert.alert('Failed', getApiErrorMessage(err));
          }
        },
      },
    ]);
  }

  function onCancel() {
    if (!id) return;
    Alert.alert('Cancel PO', 'This cannot be undone. Continue?', [
      { text: 'Back', style: 'cancel' },
      {
        text: 'Cancel PO',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelPO.mutateAsync(id);
          } catch (err) {
            Alert.alert('Failed', getApiErrorMessage(err));
          }
        },
      },
    ]);
  }

  return (
    <PermissionGate permission="purchase_order:read">
      <Screen>
        <ScrollView refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}>
          {query.isLoading ? (
            <DetailSkeleton />
          ) : query.isError ? (
            <ErrorState message={getApiErrorMessage(query.error, 'Could not load purchase order.')} onRetry={() => query.refetch()} />
          ) : !po ? (
            <ErrorState message="Purchase order not found." />
          ) : (
            <>
              <Title>{po.poNumber}</Title>
              <View style={styles.badgeRow}>
                <StatusBadge status={po.status} />
                {po.lifecycleStatus !== po.status ? (
                  <StatusBadge status={po.lifecycleStatus} />
                ) : null}
              </View>

              <Card>
                <DetailField label="Supplier" value={po.supplier} />
                <DetailField label="PO Date" value={formatDate(po.poDate)} />
                <DetailField label="Shop" value={po.shop?.shopName ?? po.shopId} />
                <DetailField label="Currency" value={po.currency} />
                <DetailField label="Total Value" value={formatCurrency(po.totalValue)} />
                {po.remarks ? <DetailField label="Remarks" value={po.remarks} /> : null}
              </Card>

              <SectionHeader title="Lines" count={po.items.length} icon="list-outline" />
              {po.items.map((item) => (
                <Card key={item.id}>
                  <Muted>{item.product?.productCode ?? item.lineDescription ?? '—'}</Muted>
                  <Muted>{item.product?.description ?? ''}</Muted>
                  <DetailField label="Qty" value={`${item.orderQty}`} />
                  <DetailField label="Rate" value={formatCurrency(item.rate)} />
                  <DetailField label="Value" value={formatCurrency(item.lineValue)} />
                </Card>
              ))}

              {po.receiptProgress && po.receiptProgress.length > 0 ? (
                <>
                  <SectionHeader title="Receipt Progress" icon="checkmark-done-outline" />
                  {po.receiptProgress.map((rp) => (
                    <Card key={rp.productId}>
                      <Muted>{rp.productCode ?? rp.productId.slice(0, 8)}</Muted>
                      <DetailField label="Ordered" value={`${rp.orderedQty}`} />
                      <DetailField label="Received" value={`${rp.receivedQty}`} />
                      <DetailField label="Remaining" value={`${rp.remainingQty}`} />
                    </Card>
                  ))}
                </>
              ) : null}

              <AuditInfo createdAt={po.createdAt} updatedAt={po.updatedAt} />

              <View style={styles.actions}>
                <PdfDownloadButton
                  url={`/purchase-orders/${po.id}/export-pdf`}
                  filename={`${po.poNumber}.pdf`}
                />
                {po.status === 'DRAFT' && canWrite ? (
                  <>
                    <Button label="Confirm" onPress={onConfirm} loading={confirmPO.isPending} />
                    <Button label="Cancel PO" variant="secondary" onPress={onCancel} loading={cancelPO.isPending} />
                  </>
                ) : null}
              </View>
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
