import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { RecommendationsCardData } from '@/api/dashboard';
import { formatCurrency } from '@/api/dashboard';

interface RecommendationsCardProps {
  data: RecommendationsCardData;
  onPress?: () => void;
}

export function RecommendationsCard({ data, onPress }: RecommendationsCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>💡 Recommendations</Text>

      {data.length === 0 ? (
        <View>
          <Text style={styles.emptyText}>Coming soon...</Text>
          <Text style={styles.emptyDescription}>
            Month 1: Collecting data {'\n'}
            Month 5+: Intelligence available
          </Text>
        </View>
      ) : (
        data.map((rec, index) => (
          <View key={`rec-${index}`}>
            <View style={styles.recommendation}>
              <Text style={styles.action}>{rec.action}</Text>

              {rec.reason && (
                <Text style={styles.reason}>{rec.reason}</Text>
              )}

              {rec.expectedProfit && (
                <View style={styles.metricsRow}>
                  <View>
                    <Text style={styles.metricLabel}>Expected Profit</Text>
                    <Text style={styles.metricValue}>
                      {formatCurrency(rec.expectedProfit)}
                    </Text>
                  </View>

                  {rec.confidence && (
                    <View>
                      <Text style={styles.metricLabel}>Confidence</Text>
                      <Text style={[styles.metricValue, { color: '#10b981' }]}>
                        {Math.round(rec.confidence * 100)}%
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.acceptButton}>
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>

            {index < data.length - 1 && <View style={styles.recDivider} />}
          </View>
        ))
      )}
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
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 18,
  },
  recommendation: {
    paddingVertical: 12,
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  reason: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  acceptButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  recDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
});
