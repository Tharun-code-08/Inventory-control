'use client';

import React from 'react';
import type { FinancialCardData } from '@/api/dashboard';
import { formatCurrency } from '@/api/dashboard';

interface FinancialCardProps {
  data: FinancialCardData;
}

export function FinancialCard({ data }: FinancialCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">💰 Financial Health</h3>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-sm text-gray-600 mb-1">Revenue Today</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.revenueToday)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Revenue This Month</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.revenueThisMonth)}
          </p>
        </div>
      </div>

      <hr className="mb-6" />

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-sm text-gray-600 mb-1">Gross Profit</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(data.grossProfit)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Net Profit</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(data.netProfit)}</p>
        </div>
      </div>

      <hr className="mb-6" />

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-gray-600 mb-1">Receivables</p>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(data.receivables)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Payables</p>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(data.payables)}</p>
        </div>
      </div>
    </div>
  );
}
