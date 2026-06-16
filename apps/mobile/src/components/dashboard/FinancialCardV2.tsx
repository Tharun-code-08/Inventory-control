import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { FinancialCardData } from '@/api/dashboard';
import { formatCurrency } from '@/api/dashboard';

interface FinancialCardProps {
  data: FinancialCardData;
  lastUpdated?: Date;
  onPress?: () => void;
}

/**
 * Week 4 Update: Financial Card - Actionable Version
 * - Shows trend indicators (↑/↓)
 * - Includes timestamp ("Last updated: 09:32 AM")
 * - Highlights action item (Rice margins falling)
 * - Makes decision-making obvious
 */
export function FinancialCard({ data, lastUpdated, onPress }: FinancialCardProps) {
  const formatTime = (date?: Date) => {
    if (!date) return 'now';
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>💰 Financial Health</Text>
        <Text style={styles.timestamp}>Updated: {formatTime(lastUpdated)} ↻</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Revenue Today</Text>
          <Text style={styles.value}>{formatCurrency(data.revenueToday)}</Text>
          <Text style={styles.trend}>↑ 8% vs yesterday</Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.label}>Revenue Month</Text>
          <Text style={styles.value}>{formatCurrency(data.revenueThisMonth)}</Text>
          <Text style={styles.trend}>↑ 12% vs last month</Text>
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
          <Text style={styles.trend}>↑ 12% vs last month</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionSection}>
        <Text style={styles.actionLabel}>⚠️ Action Needed</Text>
        <Text style={styles.actionText}>Rice margins falling 3% this month</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Review Pricing →</Text>
        </TouchableOpacity>
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
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  timestamp: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
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
  trend: {
    fontSize: 11,
    color: '#10b981',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  actionSection: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    padding: 12,
    borderRadius: 4,
    marginTop: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 13,
    color: '#78350f',
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
