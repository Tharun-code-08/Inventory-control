import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
  RefreshControl,
} from 'react-native';
import {
  fetchExecutiveDashboard,
  emitDashboardEvent,
  newDashboardSession,
  type DashboardCard,
  type ExecutiveDashboardResponse,
} from '@/api/dashboard';
import { FinancialCard } from './FinancialCard';
import { InventoryCard } from './InventoryCard';
import { AttentionCard } from './AttentionCard';
import { RecommendationsCard } from './RecommendationsCard';

interface ExecutiveDashboardProps {
  shopId?: string;
  onLoadingChange?: (loading: boolean) => void;
}

export function ExecutiveDashboard({ shopId, onLoadingChange }: ExecutiveDashboardProps) {
  const [data, setData] = useState<ExecutiveDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadTime, setLoadTime] = useState<number>(0);

  // Telemetry: one session per mount; first-click captured once.
  const sessionId = useRef(newDashboardSession());
  const firstClickSent = useRef(false);

  const handleCardClick = (card: DashboardCard) => {
    emitDashboardEvent({
      type: 'card',
      card,
      firstClick: !firstClickSent.current,
      sessionId: sessionId.current,
    });
    firstClickSent.current = true;
  };

  const handleAction = (card: DashboardCard, action: string) => {
    handleCardClick(card);
    emitDashboardEvent({ type: 'action', card, action, sessionId: sessionId.current });
  };

  const loadDashboard = async () => {
    try {
      const startTime = Date.now();
      setError(null);
      const result = await fetchExecutiveDashboard(shopId);
      const endTime = Date.now();
      const elapsed = endTime - startTime;
      setLoadTime(elapsed);
      setData(result);
      emitDashboardEvent({ type: 'opened', loadTimeMs: elapsed, sessionId: sessionId.current });

      // Log load time for monitoring
      if (elapsed > 2000) {
        console.warn(`Dashboard load time: ${elapsed}ms (target: < 2000ms)`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(errorMessage);
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      onLoadingChange?.(false);
    }
  };

  useEffect(() => {
    onLoadingChange?.(true);
    loadDashboard();
  }, [shopId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.retryText}>Pull down to try again</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No data available</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Executive Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Updated just now • {loadTime}ms load
        </Text>
      </View>

      <View style={styles.content}>
        <FinancialCard
          data={data.financial}
          onPress={() => handleCardClick('financial')}
        />
        <InventoryCard
          data={data.inventory}
          onPress={() => handleCardClick('inventory')}
        />
        <AttentionCard
          data={data.attention}
          onPress={() => handleAction('attention', 'resolve')}
        />
        <RecommendationsCard
          data={data.recommendations}
          onPress={() => handleCardClick('recommendations')}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tip: Check Attention first, then Financial, then act on Recommendations
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '500',
    marginBottom: 8,
  },
  retryText: {
    fontSize: 12,
    color: '#6b7280',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  content: {
    paddingVertical: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginVertical: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },
});
