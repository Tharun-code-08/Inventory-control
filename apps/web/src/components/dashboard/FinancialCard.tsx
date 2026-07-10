'use client';

import type { FinancialCardData } from '@/api/dashboard';
import { formatCurrency } from '@/api/dashboard';

interface FinancialCardProps {
  data: FinancialCardData;
}

export function FinancialCard({ data }: FinancialCardProps) {
  return (
    <div className="bg-card rounded-lg shadow p-6 hover:shadow-lg transition">
      <h3 className="text-lg font-semibold text-foreground mb-6">Am I making money?</h3>

      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Revenue Today</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(data.revenueToday)}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Revenue This Month</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(data.revenueThisMonth)}</p>
        </div>

        <hr className="my-4" />

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Net Profit (Month)</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(data.netProfitMonth)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Cash Available</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(data.cashAvailable)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
