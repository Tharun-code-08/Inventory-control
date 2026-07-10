'use client';

import type { InventoryCardData } from '@/api/dashboard';
import { formatCurrency, formatNumber } from '@/api/dashboard';

interface InventoryCardProps {
  data: InventoryCardData;
}

export function InventoryCard({ data }: InventoryCardProps) {
  return (
    <div className="bg-card rounded-lg shadow p-6 hover:shadow-lg transition">
      <h3 className="text-lg font-semibold text-foreground mb-6">Is my money stuck?</h3>

      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Inventory Value</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(data.inventoryValue)}</p>
        </div>

        <hr className="my-4" />

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Low Stock Items</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatNumber(data.lowStockCount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Dead Stock</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(data.deadStockValue)}</p>
          </div>
        </div>

        <hr className="my-4" />

        <div>
          <p className="text-sm text-muted-foreground mb-1">Stock Coverage Days</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.coverageDays} days</p>
        </div>
      </div>
    </div>
  );
}
