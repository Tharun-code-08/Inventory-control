import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { usePostAdjustment, useStockCountVariance } from '@/hooks/use-stock-count';
import { getApiErrorMessage } from '@/lib/api-error';
import { Button, EmptyState, Muted, Screen, Title } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function VarianceReviewScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const query = useStockCountVariance(sessionId ?? '');
  const postAdjustment = usePostAdjustment(sessionId ?? '');
  const rows = query.data ?? [];

  const handleApprove = () => {
    postAdjustment.mutate(undefined, {
      onSuccess: () => {
        router.replace({ pathname: '/stock-count/[sessionId]/result', params: { sessionId: sessionId! } });
      },
    });
  };

  const varianceColor = (variance: number) =>
    variance === 0 ? colors.success : variance < 0 ? colors.danger : colors.warning;

  const listHeader = (
    <>
      <Title>Variance</Title>
      <Muted style={styles.hint}>Compare counted quantities against expected stock.</Muted>
      {query.isError ? (
        <Muted style={styles.error}>{getApiErrorMessage(query.error, 'Could not load variance.')}</Muted>
      ) : null}
      {postAdjustment.isError ? (
        <Muted style={styles.error}>{getApiErrorMessage(postAdjustment.error, 'Could not post the adjustment.')}</Muted>
      ) : null}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.productCell]}>Product</Text>
        <Text style={styles.headerCell}>Expected</Text>
        <Text style={styles.headerCell}>Counted</Text>
        <Text style={styles.headerCell}>Variance</Text>
      </View>
    </>
  );

  return (
    <PermissionGate permission="product:read">
      <Screen>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.productId}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              icon="analytics-outline"
              message={query.isLoading ? 'Loading…' : 'No variance data available.'}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={[styles.cell, styles.productCell]} numberOfLines={1}>{item.productId}</Text>
              <Text style={styles.cell}>{item.expectedQty}</Text>
              <Text style={styles.cell}>{item.countedQty}</Text>
              <Text style={[styles.cell, { color: varianceColor(item.variance), fontWeight: '600' }]}>
                {item.variance > 0 ? `+${item.variance}` : item.variance}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.list}
        />
        <View style={styles.footer}>
          <Button
            label="Approve adjustment"
            onPress={handleApprove}
            loading={postAdjustment.isPending}
            disabled={query.isLoading || rows.length === 0}
          />
        </View>
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.sm },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    flex: 1,
    fontWeight: '600',
    fontSize: 13,
    color: colors.muted,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  cell: {
    flex: 1,
    color: colors.text,
    textAlign: 'right',
  },
  productCell: { flex: 1.4, textAlign: 'left' },
  list: { paddingBottom: 96 },
  footer: { paddingTop: spacing.sm },
});
