'use client';

import { useEffect, useState } from 'react';
import {
  getActionCenter,
  getPriorityIcon,
  getCategoryIcon,
  getCategoryLabel,
  ActionCenterResponse,
} from '@/api/reports';
import Loading from '@/components/Loading';
import ErrorView from '@/components/Error';

interface Props {
  shopId?: string;
}

export default function ActionCenterReport({ shopId }: Props) {
  const [data, setData] = useState<ActionCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getActionCenter({ shopId });
        setData(response);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch action center');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shopId]);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} />;
  if (!data) return <ErrorView message="No data available" />;

  const totalActions = data.actionsSummary.critical + data.actionsSummary.high + data.actionsSummary.medium;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Action Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Your daily action list - prioritized by impact</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Last updated</p>
          <p className="text-sm font-medium text-foreground">{new Date(data.generatedAt).toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Summary Badges */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 dark:bg-red-500/10 rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">🔴 Critical</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{data.actionsSummary.critical}</p>
          <p className="text-xs text-red-500 mt-1">Needs immediate action</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-500/10 rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-sm font-medium text-orange-600 dark:text-orange-400">🟠 High</p>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{data.actionsSummary.high}</p>
          <p className="text-xs text-orange-500 mt-1">This week</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-500/10 rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">🟡 Medium</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{data.actionsSummary.medium}</p>
          <p className="text-xs text-yellow-500 mt-1">Next week</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">📋 Total</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalActions}</p>
          <p className="text-xs text-blue-500 mt-1">Actions to handle</p>
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-3">
        {data.actions.length === 0 ? (
          <div className="bg-green-50 dark:bg-green-500/10 border-2 border-green-300 rounded-lg p-8 text-center">
            <p className="text-2xl font-bold text-green-900">✅ All Clear!</p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-2">No urgent actions needed right now.</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">Keep monitoring your reports regularly.</p>
          </div>
        ) : (
          data.actions.map((action) => (
            <div
              key={action.id}
              className={`rounded-lg shadow border-l-4 overflow-hidden transition-all ${
                action.priority === 'CRITICAL'
                  ? 'bg-red-50 dark:bg-red-500/10 border-red-500 hover:shadow-lg'
                  : action.priority === 'HIGH'
                    ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-500 hover:shadow-lg'
                    : 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-500 hover:shadow-lg'
              }`}
            >
              {/* Action Header */}
              <div
                className="px-6 py-4 cursor-pointer flex items-start justify-between"
                onClick={() => setExpandedAction(expandedAction === action.id ? null : action.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getPriorityIcon(action.priority)}</span>
                    <div>
                      <p className="font-semibold text-foreground">{action.title}</p>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-card">
                    {getCategoryIcon(action.category)} {getCategoryLabel(action.category)}
                  </span>
                  <button className="text-muted-foreground hover:text-muted-foreground text-lg">
                    {expandedAction === action.id ? '▼' : '▶'}
                  </button>
                </div>
              </div>

              {/* Action Details (Expandable) */}
              {expandedAction === action.id && (
                <div className="px-6 py-4 border-t border-opacity-20 bg-card space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Suggested Action</p>
                    <p className="text-sm text-foreground bg-muted p-3 rounded font-medium">{action.suggestedAction}</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Estimated Impact</p>
                    <p className="text-sm text-foreground bg-green-50 dark:bg-green-500/10 p-3 rounded text-green-900">✓ {action.estimatedImpact}</p>
                  </div>

                  {Object.keys(action.details).length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Details</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(action.details).map(([key, value]) => (
                          <div key={key} className="bg-muted p-2 rounded text-xs">
                            <p className="text-muted-foreground font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                            <p className="text-foreground font-bold">
                              {typeof value === 'number' ? (key.includes('amount') ? `₹${(value / 100000).toFixed(2)}L` : value.toLocaleString()) : value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-xs text-muted-foreground">From: {action.reportSource}</p>
                    <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700">
                      View in {action.reportSource} →
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Daily Ritual Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
        <h3 className="text-lg font-bold mb-2">📍 Daily Ritual</h3>
        <p className="text-sm mb-3">Start your day by reviewing these 5 steps:</p>
        <ol className="text-sm space-y-1">
          <li>✓ Check Action Center (you're here!)</li>
          <li>✓ Handle all CRITICAL items</li>
          <li>✓ Plan HIGH priority actions for today</li>
          <li>✓ Schedule MEDIUM priority work</li>
          <li>✓ Update teams on progress</li>
        </ol>
        <p className="text-xs mt-3 opacity-90">Takes ~10 minutes. Prevents problems from becoming crises.</p>
      </div>

      {/* Key Metrics */}
      {data.actions.length > 0 && (
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="font-semibold text-foreground mb-4">By Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { cat: 'cash-flow' as const, count: data.actions.filter((a) => a.category === 'cash-flow').length },
              { cat: 'procurement' as const, count: data.actions.filter((a) => a.category === 'procurement').length },
              { cat: 'inventory' as const, count: data.actions.filter((a) => a.category === 'inventory').length },
              { cat: 'pricing' as const, count: data.actions.filter((a) => a.category === 'pricing').length },
              { cat: 'opportunity' as const, count: data.actions.filter((a) => a.category === 'opportunity').length },
            ].map((item) =>
              item.count > 0 ? (
                <div key={item.cat} className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-xl">{getCategoryIcon(item.cat)}</p>
                  <p className="text-xs font-medium text-muted-foreground mt-1">{getCategoryLabel(item.cat)}</p>
                  <p className="text-lg font-bold text-foreground">{item.count}</p>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}
    </div>
  );
}
