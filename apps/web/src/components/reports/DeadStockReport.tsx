'use client';

import { useEffect, useState } from 'react';
import { getDeadStockReport, getSeverityIcon, getRecommendationLabel, DeadStockResponse, DeadStockFilters } from '@/api/reports';
import Loading from '@/components/Loading';
import ErrorView from '@/components/Error';

interface Props {
  shopId?: string;
}

export default function DeadStockReport({ shopId }: Props) {
  const [data, setData] = useState<DeadStockResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DeadStockFilters>({
    shopId,
    daysUnsold: 90,
    sortBy: 'stockValue',
    page: 1,
    limit: 50,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getDeadStockReport(filters);
        setData(response);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dead stock report');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const handleDaysChange = (days: number) => {
    setFilters({ ...filters, daysUnsold: days, page: 1 });
  };

  const handleSortChange = (sortBy: 'stockValue' | 'daysUnsold') => {
    setFilters({ ...filters, sortBy, page: 1 });
  };

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} />;
  if (!data) return <ErrorView message="No data available" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dead Stock Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Products unsold for extended periods</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-sm font-medium text-muted-foreground">Total Items</p>
          <p className="text-2xl font-bold text-foreground">{data.summary.totalDeadItems}</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-sm font-medium text-muted-foreground">Total Quantity</p>
          <p className="text-2xl font-bold text-foreground">{data.summary.totalDeadQty.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <p className="text-sm font-medium text-muted-foreground">Locked Value</p>
          <p className="text-2xl font-bold text-foreground">₹{(data.summary.totalDeadValue / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border-l-4 border-purple-500">
          <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
          <p className="text-2xl font-bold text-foreground">{data.summary.theme}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Days Unsold</label>
            <div className="flex gap-2">
              {[30, 60, 90, 180].map((days) => (
                <button
                  key={days}
                  onClick={() => handleDaysChange(days)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    filters.daysUnsold === days
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-foreground hover:bg-gray-300'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleSortChange(e.target.value as 'stockValue' | 'daysUnsold')}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="stockValue">Stock Value (High to Low)</option>
              <option value="daysUnsold">Days Unsold (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">Stock Qty</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">Stock Value</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">Days Unsold</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-foreground uppercase tracking-wider">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    No dead stock found
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.productId} className="hover:bg-muted">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      <div>
                        <div className="font-semibold">{item.productCode}</div>
                        <div className="text-xs text-muted-foreground">{item.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{item.category}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{item.supplier}</td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-foreground">
                      {item.currentStock.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-foreground">
                      ₹{(item.stockValue / 100000).toFixed(2)}L
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-foreground">{item.daysUnsold}</td>
                    <td className="px-6 py-4 text-center text-lg">{getSeverityIcon(item.severity)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.recommendation === 'STOP_REORDER'
                            ? 'bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300'
                            : item.recommendation === 'OFFER_DISCOUNT'
                              ? 'bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300'
                              : 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-800 dark:text-yellow-300'
                        }`}
                      >
                        {getRecommendationLabel(item.recommendation)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.pagination.totalCount > data.pagination.limit && (
          <div className="bg-muted border-t border-border px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(filters.page ?? 1 - 1) * data.pagination.limit + 1} to{' '}
              {Math.min((filters.page ?? 1) * data.pagination.limit, data.pagination.totalCount)} of{' '}
              {data.pagination.totalCount} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: Math.max((filters.page ?? 1) - 1, 1) })}
                disabled={(filters.page ?? 1) === 1}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) + 1 })}
                disabled={(filters.page ?? 1) * data.pagination.limit >= data.pagination.totalCount}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
