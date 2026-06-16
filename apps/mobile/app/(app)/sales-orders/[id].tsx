import { Alert, ScrollView, RefreshControl, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { StatusBadge } from '@/components/StatusBadge';
import { DetailField } from '@/components/DetailField';
import { SectionHeader } from '@/components/SectionHeader';
import { DetailSkeleton } from '@/components/DetailSkeleton';
import { ErrorState } from '@/components/ErrorState';
import {
  useSalesOrder,
  useConfirmSalesOrder,
  useFulfillSalesOrder,
} from '@/hooks/use-sales-orders';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button, Card, Muted, Screen, Title } from '@/components/ui';
import { spacing } from '@/theme';

export default function SalesOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const query = useSalesOrder(id ?? '');
  const confirmSO = useConfirmSalesOrder();
  const fulfillSO = useFulfillSalesOrder();
  const canWrite = hasPermission(user, 'shop:write');
  const so = query.data;

  function onConfirm() {
    if (!id) return;
    Alert.alert('Confirm order', 'Mark this sales order as confirmed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await confirmSO.mutateAsync(id);
          } catch (err) {
            Alert.alert('Failed', getApiErrorMessage(err));
          }
        },
      },
    ]);
  }

  function onFulfill() {
    if (!id) return;
    Alert.alert('Fulfill order', 'This issues stock for all lines. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Fulfill',
        onPress: async () => {
          try {
            await fulfillSO.mutateAsync(id);
          } catch (err) {
            Alert.alert('Failed', getApiErrorMessage(err));
          }
        },
      },
    ]);
  }

  return (
    <PermissionGate permission="shop:read">
      <Screen>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
          }
        >
          {query.isLoading ? (
            <DetailSkeleton />
          ) : query.isError ? (
            <ErrorState
              message={getApiErrorMessage(query.error, 'Could not load sales order.')}
              onRetry={() => query.refetch()}
            />
          ) : !so ? (
            <ErrorState message="Sales order not found." />
          ) : (
            <>
              <Title>{so.soNumber}</Title>
              <View style={styles.badgeRow}>
                <StatusBadge status={so.status} />
              </View>

              <Card>
                <DetailField label="Customer" value={so.customer?.customerName ?? '—'} />
                <DetailField label="Order Date" value={formatDate(so.orderDate)} />
                {so.expectedDate ? (
                  <DetailField label="Expected" value={formatDate(so.expectedDate)} />
                ) : null}
                <DetailField label="Shop" value={so.shop?.shopName ?? so.shopId} />
                <DetailField label="Total Value" value={formatCurrency(so.totalValue)} />
                {so.remarks ? <DetailField label="Remarks" value={so.remarks} /> : null}
              </Card>

              <SectionHeader title="Lines" count={so.items.length} icon="list-outline" />
              {so.items.map((item) => (
                <Card key={item.id}>
                  <Muted>{item.product?.productCode ?? '—'}</Muted>
                  <Muted>{item.product?.description ?? ''}</Muted>
                  <DetailField label="Qty" value={`${item.quantity}`} />
                  <DetailField label="Unit Price" value={formatCurrency(item.unitPrice)} />
                  <DetailField label="Value" value={formatCurrency(item.lineValue)} />
                </Card>
              ))}

              {canWrite ? (
                <View style={styles.actions}>
                  {so.status === 'DRAFT' ? (
                    <Button label="Confirm" onPress={onConfirm} loading={confirmSO.isPending} />
                  ) : null}
                  {so.status === 'CONFIRMED' ? (
                    <Button label="Fulfill (issue stock)" onPress={onFulfill} loading={fulfillSO.isPending} />
                  ) : null}
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
