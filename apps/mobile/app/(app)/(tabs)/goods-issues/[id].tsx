import { Alert, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { useGoodsIssue, usePostGoodsIssue } from '@/hooks/use-goods-issues';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { Badge, Button, Card, EmptyState, Muted, Screen, Subtitle, Title } from '@/components/ui';
import { formatDate } from '@/lib/format';

export default function GoodsIssueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const query = useGoodsIssue(id ?? '');
  const postGi = usePostGoodsIssue();
  const canPost = hasPermission(user, 'goods_issue:create');
  const gi = query.data;

  function onPost() {
    if (!id) return;
    Alert.alert('Post goods issue', 'This will deduct stock. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Post',
        onPress: async () => {
          try {
            await postGi.mutateAsync(id);
            query.refetch();
          } catch (err) {
            Alert.alert('Failed', getApiErrorMessage(err));
          }
        },
      },
    ]);
  }

  return (
    <PermissionGate permission="goods_issue:read">
      <Screen>
        <ScrollView refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}>
          {query.isError ? (
            <EmptyState message={getApiErrorMessage(query.error, 'Could not load goods issue.')} />
          ) : query.isLoading || !gi ? (
            <EmptyState message="Loading…" />
          ) : (
            <>
              <Title>{gi.giNumber}</Title>
              <Badge label={gi.status} tone={gi.status === 'POSTED' ? 'success' : 'warning'} />
              <Card>
                <Muted>Date: {formatDate(gi.giDate)}</Muted>
                <Muted>Shop: {gi.shop?.shopName ?? gi.shopId}</Muted>
                <Muted>Reason: {gi.issueReason}</Muted>
                {gi.remarks ? <Muted>Remarks: {gi.remarks}</Muted> : null}
              </Card>
              <Subtitle>Lines ({gi.items.length})</Subtitle>
              {gi.items.map((line) => (
                <Card key={line.id}>
                  <Muted>{line.product.productCode}</Muted>
                  <Muted>{line.product.description}</Muted>
                  <Muted>
                    Qty {line.quantity} {line.uom}
                  </Muted>
                </Card>
              ))}
              {gi.status === 'DRAFT' && canPost ? (
                <Button label="Post issue" onPress={onPost} loading={postGi.isPending} />
              ) : null}
            </>
          )}
        </ScrollView>
      </Screen>
    </PermissionGate>
  );
}
