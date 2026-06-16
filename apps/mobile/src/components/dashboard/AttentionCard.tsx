import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { AttentionCardData } from '@/api/dashboard';
import { getSeverityColor } from '@/api/dashboard';

interface AttentionCardProps {
  data: AttentionCardData;
  onPress?: () => void;
}

export function AttentionCard({ data, onPress }: AttentionCardProps) {
  if (data.length === 0) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>⚙️ Attention Required</Text>
        <Text style={styles.emptyText}>All systems normal ✓</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>⚙️ Attention Required</Text>

      {data.map((item, index) => (
        <View key={`${item.type}-${index}`}>
          <View style={styles.item}>
            <View
              style={[
                styles.severityDot,
                { backgroundColor: getSeverityColor(item.severity) },
              ]}
            />
            <View style={styles.itemContent}>
              <Text style={styles.itemType}>
                {formatAttentionType(item.type)}
              </Text>
              <Text style={styles.itemCount}>{item.count} items</Text>
            </View>
          </View>
          {index < data.length - 1 && <View style={styles.itemDivider} />}
        </View>
      ))}

      <TouchableOpacity style={styles.actionButton} onPress={onPress}>
        <Text style={styles.actionButtonText}>Resolve Now →</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function formatAttentionType(type: string): string {
  const map: { [key: string]: string } = {
    overdue_receipts: 'Overdue Receipts',
    pending_approvals: 'Pending Approvals',
    transfers_pending: 'Transfers Pending',
    supplier_issues: 'Supplier Issues',
    overdue_payments: 'Overdue Payments',
    low_stock_alerts: 'Low Stock Alerts',
  };
  return map[type] || type;
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
  emptyText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  actionButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
});
