'use client';

import React, { useEffect, useState } from 'react';
import { fetchExecutiveDashboard, type ExecutiveDashboardResponse } from '@/api/dashboard';
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

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const startTime = performance.now();
        setError(null);
        const result = await fetchExecutiveDashboard(shopId);
        const endTime = performance.now();
        setLoadTime(Math.round(endTime - startTime));
        setData(result);

        if (endTime - startTime > 2000) {
          console.warn(
            `Dashboard load time: ${Math.round(endTime - startTime)}ms (target: < 2000ms)`,
          );
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
      setLoadTime(Math.round(endTime - startTime));
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reload dashboard';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
            <p className="text-sm text-gray-600 mt-2">
              Updated just now • {loadTime}ms load time
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <FinancialCard data={data.financial} />
          </div>
          <InventoryCard data={data.inventory} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AttentionCard data={data.attention} />
          <RecommendationsCard data={data.recommendations} />
        </div>

        {/* Footer Tip */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            💡 <strong>Tip:</strong> Check Attention first to identify urgent issues, then review
            Financial and act on Recommendations
          </p>
        </div>
      </div>
    </div>
  );
}
