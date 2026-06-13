import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { FinancialCardData } from '@/api/dashboard';
import { formatCurrency } from '@/api/dashboard';

interface FinancialCardProps {
  data: FinancialCardData;
  onPress?: () => void;
}

export function FinancialCard({ data, onPress }: FinancialCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>💰 Financial Health</Text>

      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Revenue Today</Text>
          <Text style={styles.value}>{formatCurrency(data.revenueToday)}</Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.label}>Revenue Month</Text>
          <Text style={styles.value}>{formatCurrency(data.revenueThisMonth)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Gross Profit</Text>
          <Text style={styles.value}>{formatCurrency(data.grossProfit)}</Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.label}>Net Profit</Text>
          <Text style={styles.value}>{formatCurrency(data.netProfit)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Receivables</Text>
          <Text style={[styles.value, { color: '#f59e0b' }]}>
            {formatCurrency(data.receivables)}
          </Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.label}>Payables</Text>
          <Text style={[styles.value, { color: '#f59e0b' }]}>
            {formatCurrency(data.payables)}
          </Text>
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
