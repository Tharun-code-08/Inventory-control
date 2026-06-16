import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View, StyleSheet, Alert, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PermissionGate } from '@/components/PermissionGate';
import { SearchBar } from '@/components/SearchBar';
import { ListSkeleton } from '@/components/ListSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { useBarcodeList, useDeleteBarcode } from '@/hooks/use-barcodes';
import { Screen, Title, ListRow, EmptyState, Badge, Muted, colors } from '@/components/ui';
import { spacing } from '@/theme';

export default function BarcodeManagementScreen() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isFetching, refetch } = useBarcodeList({
    search: search.trim() || undefined,
    page,
    limit: 100, // Show a large list on mobile for quick scroll/search
  });

  const deleteBarcode = useDeleteBarcode();

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
  };

  const confirmDelete = (item: any) => {
    Alert.alert(
      'Delete barcode mapping',
      `Are you sure you want to delete the barcode ${item.barcode} mapped to ${item.product.description}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBarcode.mutateAsync(item.id);
              refetch();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete barcode mapping.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const subtitle = [
      `${item.product.productCode} — ${item.product.description}`,
      item.supplier?.supplierName ? `Supplier: ${item.supplier.supplierName}` : null
    ].filter(Boolean).join('\n');

    const rightElement = (
      <View style={styles.rightContainer}>
        {item.isPrimary && (
          <Ionicons name="star" size={16} color="#eab308" style={{ marginRight: spacing.sm }} />
        )}
        <Badge label={item.barcodeType} tone={item.barcodeType === 'INTERNAL' ? 'default' : 'primary'} />
        <Pressable
          onPress={() => confirmDelete(item)}
          hitSlop={8}
          style={styles.deleteBtn}
          disabled={deleteBarcode.isPending}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>
    );

    return (
      <ListRow
        title={item.barcode}
        subtitle={subtitle}
        right={rightElement}
      />
    );
  };

  return (
    <PermissionGate permission="product:read">
      <Screen style={styles.screen}>
        <Title>Barcode Mappings</Title>
        <SearchBar
          placeholder="Search barcode or product..."
          onSearch={(term) => {
            setSearch(term);
            setPage(1);
          }}
        />

        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <ErrorState message="Could not load barcode registry." onRetry={refetch} />
        ) : (
          <FlatList
            data={data?.items ?? []}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={isFetching} onRefresh={refetch} />
            }
            ListEmptyComponent={
              <EmptyState
                message={search ? 'No matching barcodes found.' : 'No registered barcodes.'}
                icon="barcode-outline"
              />
            }
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </Screen>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  listContent: { paddingBottom: spacing.lg },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deleteBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});
