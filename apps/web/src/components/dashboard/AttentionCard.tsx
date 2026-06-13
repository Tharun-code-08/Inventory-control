'use client';

import React from 'react';
import type { AttentionCardData } from '@/api/dashboard';
import { getSeverityColor, getSeverityBgColor } from '@/api/dashboard';

interface AttentionCardProps {
  data: AttentionCardData;
}

function formatType(type: string): string {
  const map: { [key: string]: string } = {
    overdue_receipts: 'Overdue Receipts',
    pending_approvals: 'Pending Approvals',
    transfers_pending: 'Transfers Pending',
    supplier_issues: 'Supplier Issues',
  };
  return map[type] || type;
}

export function AttentionCard({ data }: AttentionCardProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Attention Required</h3>
        <div className="text-center py-8">
          <p className="text-green-600 font-medium text-lg">All systems normal ✓</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">⚙️ Attention Required</h3>

      <div className="space-y-4">
        {data.map((item, index) => (
          <div
            key={`${item.type}-${index}`}
            className="flex items-start gap-4 p-3 rounded-lg"
            style={{ backgroundColor: getSeverityBgColor(item.severity) }}
          >
            <div
              className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: getSeverityColor(item.severity) }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{formatType(item.type)}</p>
              <p className="text-sm text-gray-600">{item.count} item(s)</p>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
        Resolve Now →
      </button>
    </div>
  );
}
