'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  fetchExecutiveDashboard,
  emitDashboardEvent,
  newDashboardSession,
  type DashboardCard,
  type ExecutiveDashboardResponse,
} from '@/api/dashboard';
import { PageHeader } from '@/components/shared/page-header';
import { FinancialCard } from './FinancialCard';
import { InventoryCard } from './InventoryCard';
import { AttentionCard } from './AttentionCard';
import { RecommendationsCard } from './RecommendationsCard';

interface ExecutiveDashboardProps {
  shopId?: string;
}

export function ExecutiveDashboard({ shopId }: ExecutiveDashboardProps) {
  const [data, setData] = useState<ExecutiveDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadTime, setLoadTime] = useState(0);

  // Telemetry: one session per mount; first-click captured once.
  const sessionId = useRef(newDashboardSession());
  const firstClickSent = useRef(false);
  const openedAt = useRef<string>(new Date().toISOString());
  const cardsViewed = useRef<Set<DashboardCard>>(new Set());
  const actionsTaken = useRef(0);
  const firstCard = useRef<DashboardCard | null>(null);

  const handleCardClick = (card: DashboardCard) => {
    if (cardsViewed.current.size === 0) {
      firstCard.current = card;
    }
    cardsViewed.current.add(card);

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
    actionsTaken.current++;
    emitDashboardEvent({ type: 'action', card, action, sessionId: sessionId.current });
  };

  // Emit DASHBOARD_EXIT when component unmounts
  useEffect(() => {
    return () => {
      if (openedAt.current) {
        emitDashboardEvent({
          type: 'exit',
          sessionId: sessionId.current,
          durationMs: Date.now() - new Date(openedAt.current).getTime(),
          cardsViewed: cardsViewed.current.size,
          actionsTaken: actionsTaken.current,
          firstCard: firstCard.current ?? undefined,
          openedAt: openedAt.current,
          closedAt: new Date().toISOString(),
        });
      }
    };
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const startTime = performance.now();
        setError(null);
        const result = await fetchExecutiveDashboard(shopId);
        const endTime = performance.now();
        const elapsed = Math.round(endTime - startTime);

        // Log response for debugging
        console.log('[Dashboard] API response:', result);

        // Ensure all required fields exist with defaults
        const safeData: ExecutiveDashboardResponse = {
          financial: result?.financial || { revenueToday: 0, revenueThisMonth: 0, netProfitMonth: 0, cashAvailable: 0 },
          inventory: result?.inventory || { inventoryValue: 0, lowStockCount: 0, deadStockValue: 0, coverageDays: 0 },
          attention: Array.isArray(result?.attention) ? result.attention : [],
          recommendations: Array.isArray(result?.recommendations) ? result.recommendations : [],
        };

        setLoadTime(elapsed);
        setData(safeData);
        emitDashboardEvent({ type: 'opened', loadTimeMs: elapsed, sessionId: sessionId.current });

        if (elapsed > 2000) {
          console.warn(`Dashboard load time: ${elapsed}ms (target: < 2000ms)`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard';
        setError(errorMessage);
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [shopId]);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const startTime = performance.now();
      const result = await fetchExecutiveDashboard(shopId);
      const endTime = performance.now();

      // Ensure all required fields exist with defaults
      const safeData: ExecutiveDashboardResponse = {
        financial: result?.financial || { revenueToday: 0, revenueThisMonth: 0, netProfitMonth: 0, cashAvailable: 0 },
        inventory: result?.inventory || { inventoryValue: 0, lowStockCount: 0, deadStockValue: 0, coverageDays: 0 },
        attention: Array.isArray(result?.attention) ? result.attention : [],
        recommendations: Array.isArray(result?.recommendations) ? result.recommendations : [],
      };

      setLoadTime(Math.round(endTime - startTime));
      setData(safeData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reload dashboard';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-4">
        <div className="text-center">
          <p className="text-lg text-red-600 font-medium mb-2">Error: {error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Safety: ensure arrays are always arrays
  const attentionData = Array.isArray(data.attention) ? data.attention : [];
  const recommendationsData = Array.isArray(data.recommendations) ? data.recommendations : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        description={`Updated just now • ${loadTime}ms load time`}
      >
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </PageHeader>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2" onClick={() => handleCardClick('financial')}>
          <FinancialCard data={data.financial} />
        </div>
        <div onClick={() => handleCardClick('inventory')}>
          <InventoryCard data={data.inventory} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div onClick={() => handleAction('attention', 'resolve')}>
          <AttentionCard data={attentionData} />
        </div>
        <div onClick={() => handleCardClick('recommendations')}>
          <RecommendationsCard data={recommendationsData} />
        </div>
      </div>

      {/* Footer Tip */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          💡 <strong>Tip:</strong> Check Attention first to identify urgent issues, then review
          Financial and act on Recommendations
        </p>
      </div>
    </div>
  );
}
