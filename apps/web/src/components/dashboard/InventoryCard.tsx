'use client';

import React from 'react';
import type { InventoryCardData } from '@/api/dashboard';
import { formatCurrency, formatNumber } from '@/api/dashboard';

interface InventoryCardProps {
  data: InventoryCardData;
}

export function InventoryCard({ data }: InventoryCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">📦 Inventory Health</h3>

      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-1">Total Value</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalValue)}</p>
      </div>

      <hr className="mb-6" />

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-sm text-gray-600 mb-1">Low Stock Items</p>
          <p className="text-xl font-bold text-amber-600">
            {formatNumber(data.lowStockCount)} items
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Dead Stock</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(data.deadStockValue)}</p>
        </div>
      </div>

      <hr className="mb-6" />

      <div>
        <p className="text-sm text-gray-600 mb-1">Stock Coverage</p>
        <p className="text-xl font-bold text-gray-900">{data.stockCoverageDays} days</p>
      </div>
    </div>
  );
}
