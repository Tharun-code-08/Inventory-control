'use client';

import type { AttentionCardData } from '@/api/dashboard';
import { getSeverityColor, getSeverityBgColor, emitDashboardEvent } from '@/api/dashboard';

interface AttentionCardProps {
  data: AttentionCardData;
}

export function AttentionCard({ data }: AttentionCardProps) {
  const handleItemResolution = (item: AttentionCardData[0]) => {
    // Emit telemetry event for attention item resolution
    emitDashboardEvent({
      type: 'attention_resolved',
      itemId: item.id,
      itemType: item.id,
      resolution: 'user_action',
    });
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">What should I do now?</h3>
        <div className="text-center py-8">
          <p className="text-green-600 font-medium text-lg">All clear ✓</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">What should I do now?</h3>

      <div className="space-y-4">
        {data.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-lg border-l-4"
            style={{
              backgroundColor: getSeverityBgColor(item.severity),
              borderLeftColor: getSeverityColor(item.severity)
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                <p className="text-xs text-gray-600 mt-1">{item.action}</p>
              </div>
              <button
                onClick={() => handleItemResolution(item)}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex-shrink-0 whitespace-nowrap"
              >
                Act
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
