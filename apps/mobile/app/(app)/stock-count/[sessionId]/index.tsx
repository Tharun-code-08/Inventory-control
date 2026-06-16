import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PermissionGate } from '@/components/PermissionGate';
import { QuantityStepper } from '@/components/QuantityStepper';
import { useAddScannedItem, useStockCountItems } from '@/hooks/use-stock-count';
import { getApiErrorMessage } from '@/lib/api-error';
import { Button, EmptyState, Input, ListRow, Muted, Screen, Title } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function SessionScanScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [barcode, setBarcode] = useState('');

  const query = useStockCountItems(sessionId ?? '');
  const addItem = useAddScannedItem(sessionId ?? '');
  const items = query.data ?? [];

  const handleAdd = () => {
    const value = barcode.trim();
    if (!value) return;
    addItem.mutate(
      { barcode: value },
      { onSuccess: () => setBarcode('') },
    );
  };

  const handleQuantityChange = (itemBarcode: string, qty: number) => {
    addItem.mutate({ barcode: itemBarcode, qty });
  };

  const goToReview = () => {
    router.push({ pathname: '/stock-count/[sessionId]/review', params: { sessionId: sessionId! } });
  };

  const listHeader = (
    <>
      <Title>Scan items</Title>
      <Muted style={styles.hint}>Scan or type a barcode, then adjust counted quantities.</Muted>
      <Input
        placeholder="Barcode"
        value={barcode}
        onChangeText={setBarcode}
        autoCapitalize="characters"
        autoCorrect={false}
        onSubmitEditing={handleAdd}
        returnKeyType="done"
      />
      <Button label="Add item" onPress={handleAdd} loading={addItem.isPending} disabled={!barcode.trim()} />
      {query.isError ? (
        <Muted style={styles.error}>{getApiErrorMessage(query.error, 'Could not load session items.')}</Muted>
      ) : null}
      {addItem.isError ? (
        <Muted style={styles.error}>{getApiErrorMessage(addItem.error, 'Could not record the scan.')}</Muted>
      ) : null}
      <View style={styles.spacer} />
    </>
  );

  return (
    <PermissionGate permission="product:read">
      <Screen>
        <FlatList
          data={items}
          keyExtractor={(item) => item.barcode}
          refreshControl={
            <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              icon="barcode-outline"
              message={query.isLoading ? 'Loading…' : 'No items scanned yet.'}
            />
          }
          renderItem={({ item }) => (
            <ListRow
              title={item.barcode}
              right={
                <QuantityStepper
                  value={item.countedQty}
                  onChange={(val) => handleQuantityChange(item.barcode, val)}
                />
              }
            />
          )}
          contentContainerStyle={styles.list}
        />
        <View style={styles.footer}>
          <Button label="Review variance" onPress={goToReview} disabled={items.length === 0} />
        </View>
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.sm },
  spacer: { height: spacing.md },
  list: { paddingBottom: 96 },
  footer: { paddingTop: spacing.sm },
});
