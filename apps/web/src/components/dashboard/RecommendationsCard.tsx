'use client';

import type { RecommendationsCardData } from '@/api/dashboard';
import { formatCurrency } from '@/api/dashboard';

interface RecommendationsCardProps {
  data: RecommendationsCardData;
}

export function RecommendationsCard({ data }: RecommendationsCardProps) {
  return (
    <div className="bg-card rounded-lg shadow p-6 hover:shadow-lg transition">
      <h3 className="text-lg font-semibold text-foreground mb-6">💡 Recommendations</h3>

      {data.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground font-medium mb-2">Coming soon...</p>
          <p className="text-sm text-muted-foreground">
            Month 1: Collecting data
            <br />
            Month 5+: Intelligence available
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((rec, index) => (
            <div
              key={`rec-${index}`}
              className="p-4 border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 rounded-lg"
            >
              <h4 className="font-semibold text-foreground mb-2">{rec.action}</h4>

              {rec.reason && <p className="text-sm text-muted-foreground mb-3">{rec.reason}</p>}

              {(rec.expectedProfit || rec.confidence) && (
                <div className="grid grid-cols-2 gap-4 mb-3">
                  {rec.expectedProfit && (
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Profit</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(rec.expectedProfit)}
                      </p>
                    </div>
                  )}
                  {rec.confidence && (
                    <div>
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {Math.round(rec.confidence * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button className="w-full px-3 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 text-sm">
                Accept
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
