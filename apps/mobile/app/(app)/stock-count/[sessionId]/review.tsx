import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { calculateVariance, postAdjustment, VarianceResult } from '@/api/stockCount';
import { colors } from '@/theme';

export default function VarianceReview() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [loading, setLoading] = useState(true);
  const [variance, setVariance] = useState<VarianceResult[]>([]);

  useEffect(() => {
    if (!sessionId) {
      Alert.alert('Error', 'Missing session id');
      router.replace('/stock-count');
      return;
    }
    const fetch = async () => {
      try {
        const data = await calculateVariance(sessionId);
        setVariance(data);
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Could not load variance');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [sessionId]);

  const handleApprove = async () => {
    if (!sessionId) return;
    try {
      await postAdjustment(sessionId);
      Alert.alert('Success', 'Adjustment posted');
      // Navigate to the result screen for this session
      router.replace({ pathname: '/stock-count/[sessionId]/result', params: { sessionId } });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to post adjustment');
    }
  };


  const renderItem = ({ item }: { item: VarianceResult }) => {
    const varianceColor = item.variance === 0 ? colors.success : item.variance < 0 ? colors.danger : colors.warning;
    return (
      <View style={styles.row}>
        <Text style={styles.productId}>{item.productId}</Text>
        <Text style={styles.cell}>{item.expectedQty}</Text>
        <Text style={styles.cell}>{item.countedQty}</Text>
        <Text style={[styles.cell, { color: varianceColor }]}>{item.variance}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Variance Review – Session {sessionId}</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={variance}
          keyExtractor={(item) => item.productId}
          renderItem={renderItem}
          ListHeaderComponent={() => (
            <View style={styles.headerRow}>
              <Text style={styles.headerCell}>Product</Text>
              <Text style={styles.headerCell}>Expected</Text>
              <Text style={styles.headerCell}>Counted</Text>
              <Text style={styles.headerCell}>Variance</Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <Text style={styles.empty}>No variance data available.</Text>
          )}
          contentContainerStyle={styles.list}
        />
      )}
      <TouchableOpacity style={styles.approveBtn} onPress={handleApprove} disabled={loading || variance.length === 0}>
        <Text style={styles.approveBtnText}>Approve Adjustment</Text>
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
    fontSize: 22,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  list: {
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    flex: 1,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  productId: {
    flex: 1,
    color: colors.text,
    textAlign: 'center',
  },
  cell: {
    flex: 1,
    color: colors.text,
    textAlign: 'center',
  },
  approveBtn: {
    backgroundColor: colors.success,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  approveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: colors.muted,
  },
});
