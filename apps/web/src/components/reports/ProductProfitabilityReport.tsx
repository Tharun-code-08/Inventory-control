'use client';

import { useEffect, useState } from 'react';
import {
  getProductProfitability,
  getProfitRankStars,
  getRecommendationColor,
  getRecommendationText,
  ProfitabilityResponse,
  ProfitabilityFilters,
} from '@/api/reports';
import Loading from '@/components/Loading';
import ErrorView from '@/components/Error';

interface Props {
  shopId?: string;
}

export default function ProductProfitabilityReport({ shopId }: Props) {
  const [data, setData] = useState<ProfitabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProfitabilityFilters>({
    shopId,
    sortBy: 'profit',
    page: 1,
    limit: 50,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getProductProfitability(filters);
        setData(response);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profitability report');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const handleSortChange = (sortBy: 'profit' | 'margin' | 'revenue') => {
    setFilters({ ...filters, sortBy, page: 1 });
  };

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} />;
  if (!data) return <ErrorView message="No data available" />;

  const profitMargin = data.summary.totalRevenue > 0 ? (data.summary.totalProfit / data.summary.totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Profitability Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Understand which products make money</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold text-foreground">₹{(data.summary.totalRevenue / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-sm font-medium text-muted-foreground">Total COGS</p>
          <p className="text-2xl font-bold text-foreground">₹{(data.summary.totalCogs / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm font-medium text-muted-foreground">Total Profit</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{(data.summary.totalProfit / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border-l-4 border-purple-500">
          <p className="text-sm font-medium text-muted-foreground">Avg Margin</p>
          <p className="text-2xl font-bold text-foreground">{data.summary.avgMargin}%</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-sm font-medium text-muted-foreground">Loss-Making</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.summary.lossMakingProducts}</p>
          <p className="text-xs text-muted-foreground mt-1">₹{(data.summary.unprofitableValue / 100000).toFixed(2)}L loss</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleSortChange(e.target.value as 'profit' | 'margin' | 'revenue')}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="profit">Profit (High to Low)</option>
              <option value="margin">Margin % (High to Low)</option>
              <option value="revenue">Revenue (High to Low)</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={filters.showLossOnly || false}
                onChange={(e) => setFilters({ ...filters, showLossOnly: e.target.checked, page: 1 })}
                className="w-4 h-4 text-red-600 dark:text-red-400 rounded border-border"
              />
              Show loss-makers only
            </label>
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
                <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">Units Sold</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">COGS</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">Margin %</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-foreground uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                    No products found
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
                    <td className="px-6 py-4 text-sm text-right font-medium text-foreground">{item.unitsSold.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-foreground">
                      ₹{(item.revenue / 100000).toFixed(2)}L
                      <div className="text-xs text-muted-foreground">@ ₹{item.avgSellingPrice.toFixed(0)}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-foreground">
                      ₹{(item.cogs / 100000).toFixed(2)}L
                      <div className="text-xs text-muted-foreground">@ ₹{item.avgCostPrice.toFixed(0)}</div>
                    </td>
                    <td
                      className={`px-6 py-4 text-sm text-right font-bold ${
                        item.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      ₹{(Math.abs(item.profit) / 100000).toFixed(2)}L
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-foreground">
                      {item.marginPercentage}%
                    </td>
                    <td className="px-6 py-4 text-center text-lg">{getProfitRankStars(item.profitRank)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium inline-block bg-${getRecommendationColor(item.recommendation)}-100 text-${getRecommendationColor(item.recommendation)}-800`}
                        style={{
                          backgroundColor:
                            item.recommendation === 'STOP_SELLING'
                              ? '#fee2e2'
                              : item.recommendation === 'REDUCE_DISCOUNT'
                                ? '#fef3c7'
                                : item.recommendation === 'MONITOR'
                                  ? '#fef08a'
                                  : '#dcfce7',
                          color:
                            item.recommendation === 'STOP_SELLING'
                              ? '#991b1b'
                              : item.recommendation === 'REDUCE_DISCOUNT'
                                ? '#b45309'
                                : item.recommendation === 'MONITOR'
                                  ? '#854d0e'
                                  : '#15803d',
                        }}
                      >
                        {getRecommendationText(item.recommendation)}
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
              Showing {((filters.page ?? 1) - 1) * data.pagination.limit + 1} to{' '}
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

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.summary.lossMakingProducts > 0 && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">⚠️ Loss-Making Products</h3>
            <p className="text-sm text-red-800 dark:text-red-300">
              {data.summary.lossMakingProducts} product(s) selling at a loss, losing ₹{(data.summary.unprofitableValue / 100000).toFixed(2)}L total.
              Consider adjusting prices or stopping sales.
            </p>
          </div>
        )}
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Profitability Snapshot</h3>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Overall margin: {profitMargin.toFixed(1)}% | Profit per ₹100 revenue: ₹{profitMargin.toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  );
}
