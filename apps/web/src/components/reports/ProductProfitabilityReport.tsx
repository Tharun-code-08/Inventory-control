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
import Error from '@/components/Error';

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
  if (error) return <Error message={error} />;
  if (!data) return <Error message="No data available" />;

  const profitMargin = data.summary.totalRevenue > 0 ? (data.summary.totalProfit / data.summary.totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Profitability Report</h1>
          <p className="text-sm text-gray-600 mt-1">Understand which products make money</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">₹{(data.summary.totalRevenue / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-sm font-medium text-gray-600">Total COGS</p>
          <p className="text-2xl font-bold text-gray-900">₹{(data.summary.totalCogs / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600">Total Profit</p>
          <p className="text-2xl font-bold text-green-600">₹{(data.summary.totalProfit / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <p className="text-sm font-medium text-gray-600">Avg Margin</p>
          <p className="text-2xl font-bold text-gray-900">{data.summary.avgMargin}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-600">Loss-Making</p>
          <p className="text-2xl font-bold text-red-600">{data.summary.lossMakingProducts}</p>
          <p className="text-xs text-gray-500 mt-1">₹{(data.summary.unprofitableValue / 100000).toFixed(2)}L loss</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleSortChange(e.target.value as 'profit' | 'margin' | 'revenue')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="profit">Profit (High to Low)</option>
              <option value="margin">Margin % (High to Low)</option>
              <option value="revenue">Revenue (High to Low)</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={filters.showLossOnly || false}
                onChange={(e) => setFilters({ ...filters, showLossOnly: e.target.checked, page: 1 })}
                className="w-4 h-4 text-red-600 rounded border-gray-300"
              />
              Show loss-makers only
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Units Sold</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">COGS</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Margin %</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.productId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div>
                        <div className="font-semibold">{item.productCode}</div>
                        <div className="text-xs text-gray-500">{item.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{item.unitsSold.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      ₹{(item.revenue / 100000).toFixed(2)}L
                      <div className="text-xs text-gray-500">@ ₹{item.avgSellingPrice.toFixed(0)}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      ₹{(item.cogs / 100000).toFixed(2)}L
                      <div className="text-xs text-gray-500">@ ₹{item.avgCostPrice.toFixed(0)}</div>
                    </td>
                    <td
                      className={`px-6 py-4 text-sm text-right font-bold ${
                        item.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      ₹{(Math.abs(item.profit) / 100000).toFixed(2)}L
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">
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
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {(filters.page ?? 1 - 1) * data.pagination.limit + 1} to{' '}
              {Math.min((filters.page ?? 1) * data.pagination.limit, data.pagination.totalCount)} of{' '}
              {data.pagination.totalCount} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: Math.max((filters.page ?? 1) - 1, 1) })}
                disabled={(filters.page ?? 1) === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page ?? 1) + 1 })}
                disabled={(filters.page ?? 1) * data.pagination.limit >= data.pagination.totalCount}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">⚠️ Loss-Making Products</h3>
            <p className="text-sm text-red-800">
              {data.summary.lossMakingProducts} product(s) selling at a loss, losing ₹{(data.summary.unprofitableValue / 100000).toFixed(2)}L total.
              Consider adjusting prices or stopping sales.
            </p>
          </div>
        )}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Profitability Snapshot</h3>
          <p className="text-sm text-blue-800">
            Overall margin: {profitMargin.toFixed(1)}% | Profit per ₹100 revenue: ₹{profitMargin.toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  );
}
