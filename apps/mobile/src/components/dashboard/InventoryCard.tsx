import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { InventoryCardData } from '@/api/dashboard';
import { formatCurrency, formatNumber } from '@/api/dashboard';

interface InventoryCardProps {
  data: InventoryCardData;
  onPress?: () => void;
}

export function InventoryCard({ data, onPress }: InventoryCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>📦 Inventory Health</Text>

      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Inventory Value</Text>
          <Text style={styles.value}>{formatCurrency(data.totalValue)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Low Stock Items</Text>
          <Text style={[styles.value, { color: '#f59e0b' }]}>
            {formatNumber(data.lowStockCount)} items
          </Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.label}>Dead Stock</Text>
          <Text style={[styles.value, { color: '#ef4444' }]}>
            {formatCurrency(data.deadStockValue)}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Stock Coverage</Text>
          <Text style={styles.value}>{data.stockCoverageDays} days</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1f2937',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  column: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
});
