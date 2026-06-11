// app/(app)/stock-count/[sessionId].tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getSessionDetails, addScannedItem, CountLineItem } from '@/src/api/stockCount';
import { colors } from '@/theme';
import { QuantityStepper } from '@/src/components/QuantityStepper';
import { useStockCountStore } from '@/src/store/stockCountStore';

export default function SessionScan() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [items, setItems] = useState<CountLineItem[]>([]);
  const [loading, setLoading] = useState(true);

  const setSession = useStockCountStore((s) => s.setSessionId);
  const addItemToStore = useStockCountStore((s) => s.addItem);

  useEffect(() => {
    if (!sessionId) {
      Alert.alert('Error', 'Session ID missing');
      router.replace('/stock-count');
      return;
    }
    setSession(sessionId);
    const load = async () => {
      try {
        const data = await getSessionDetails(sessionId);
        setItems(data);
        data.forEach((it) => addItemToStore(it));
      } catch (e) {
        console.error('Failed to load session details', e);
        Alert.alert('Error', 'Could not load session');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  const handleAddDummy = async () => {
    // In a real app this would be replaced by a camera scan.
    const dummyBarcode = 'DUMMY-001';
    try {
      const newItem = await addScannedItem(sessionId!, dummyBarcode, 1);
      setItems((prev) => [...prev, newItem]);
      addItemToStore(newItem);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const renderItem = ({ item }: { item: CountLineItem }) => (
    <View style={styles.row}>
      <Text style={styles.barcode}>{item.barcode}</Text>
      <QuantityStepper
        value={item.countedQty}
        onChange={(val) => {
          // Directly update local state; persisting change to backend would require a patch endpoint.
          setItems((prev) =>
            prev.map((it) => (it.barcode === item.barcode ? { ...it, countedQty: val } : it))
          );
        }}
      />
    </View>
  );

  const goToReview = () => {
    router.push({ pathname: `/stock-count/${sessionId}/review` });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Session {sessionId}</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.barcode}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>No items scanned yet.</Text>}
          contentContainerStyle={styles.list}
        />
      )}
      <TouchableOpacity style={styles.scanBtn} onPress={handleAddDummy}>
        <Text style={styles.scanBtnText}>Add Dummy Scan</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.nextBtn} onPress={goToReview} disabled={items.length === 0}>
        <Text style={styles.nextBtnText}>Review Variance</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  list: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  barcode: {
    color: '#fff',
    fontFamily: 'Inter',
  },
  scanBtn: {
    backgroundColor: colors.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  scanBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  nextBtn: {
    backgroundColor: colors.success,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    opacity: 1,
  },
  nextBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#aaa',
    fontFamily: 'Inter',
  },
});
