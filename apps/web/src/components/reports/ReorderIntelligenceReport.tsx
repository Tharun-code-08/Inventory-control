'use client';

import { useEffect, useState } from 'react';
import { getReorderIntelligence, getUrgencyIcon, getUrgencyLabel, ReorderResponse, ReorderFilters } from '@/api/reports';
import Loading from '@/components/Loading';
import ErrorView from '@/components/Error';

interface Props {
  shopId: string;
}

export default function ReorderIntelligenceReport({ shopId }: Props) {
  const [data, setData] = useState<ReorderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReorderFilters>({
    shopId,
    sortBy: 'urgency',
    page: 1,
    limit: 50,
  });
  const [showCalculation, setShowCalculation] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getReorderIntelligence(filters);
        setData(response);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch reorder report');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const handleSortChange = (sortBy: 'urgency' | 'daysLeft' | 'avgSalesPerDay') => {
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
          <h1 className="text-2xl font-bold text-gray-900">Reorder Intelligence</h1>
          <p className="text-sm text-gray-600 mt-1">Predict stockouts and suggested order quantities</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-600">🔴 Urgent</p>
          <p className="text-2xl font-bold text-gray-900">{data.summary.urgent.count}</p>
          <p className="text-xs text-gray-500 mt-1">Order {data.summary.urgent.totalOrderQty.toLocaleString()} units</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <p className="text-sm font-medium text-gray-600">🟡 Warning</p>
          <p className="text-2xl font-bold text-gray-900">{data.summary.warning.count}</p>
          <p className="text-xs text-gray-500 mt-1">Order {data.summary.warning.totalOrderQty.toLocaleString()} units</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600">🟢 Normal</p>
          <p className="text-2xl font-bold text-gray-900">{data.summary.normal.count}</p>
          <p className="text-xs text-gray-500 mt-1">Stock is healthy</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">{data.summary.totalProducts}</p>
          <p className="text-xs text-gray-500 mt-1">In this shop</p>
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
              onChange={(e) => handleSortChange(e.target.value as 'urgency' | 'daysLeft' | 'avgSalesPerDay')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="urgency">Urgency (High to Low)</option>
              <option value="daysLeft">Days Remaining (Low to High)</option>
              <option value="avgSalesPerDay">Sales Velocity (High to Low)</option>
            </select>
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Daily Sales</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Days Left</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Order Qty</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Urgency</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    All products have healthy stock levels
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
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      {item.currentStock.toLocaleString()}
                      {item.minStockLevel > 0 && (
                        <div className="text-xs text-gray-500">Min: {item.minStockLevel.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      {item.avgSalesPerDay}
                      <div className="text-xs text-gray-500">({item.salesLast30Days}/30d)</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-gray-900">
                      {item.daysRemaining === 999 ? '∞' : item.daysRemaining}
                      <div className={`text-xs font-normal ${item.daysRemaining < 7 ? 'text-red-600' : item.daysRemaining < 14 ? 'text-orange-600' : 'text-green-600'}`}>
                        {item.daysRemaining < 7 ? 'Critical' : item.daysRemaining < 14 ? 'Soon' : 'Healthy'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">
                      {item.suggestedOrderQty.toLocaleString()}
                      <button
                        onClick={() => setShowCalculation(showCalculation === item.productId ? null : item.productId)}
                        className="text-xs text-gray-500 hover:text-blue-600 ml-2"
                      >
                        {showCalculation === item.productId ? '▼' : '▶'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center text-lg">{getUrgencyIcon(item.urgency)}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium inline-block ${
                          item.urgency === 'HIGH'
                            ? 'bg-red-100 text-red-800'
                            : item.urgency === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {getUrgencyLabel(item.urgency)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Calculation Details (Expandable) */}
        {showCalculation && (
          <div className="bg-blue-50 border-t border-gray-200 px-6 py-4">
            {data.items
              .filter((item) => item.productId === showCalculation)
              .map((item) => (
                <div key={item.productId} className="space-y-3">
                  <h4 className="font-semibold text-gray-900">
                    {item.productCode} - {item.name}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-gray-600 font-medium">Sales Last 30 Days</p>
                      <p className="text-lg font-bold text-gray-900">{item.calculation.salesLast30Days}</p>
                    </div>
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-gray-600 font-medium">Avg Daily Sales</p>
                      <p className="text-lg font-bold text-gray-900">{item.calculation.avgSalesPerDay}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.calculation.salesLast30Days} ÷ 30</p>
                    </div>
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-gray-600 font-medium">Current Stock</p>
                      <p className="text-lg font-bold text-gray-900">{item.calculation.currentStock}</p>
                    </div>
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-gray-600 font-medium">Days Remaining</p>
                      <p className="text-lg font-bold text-gray-900">{item.calculation.daysRemaining === 999 ? '∞' : item.calculation.daysRemaining}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.calculation.currentStock} ÷ {item.calculation.avgSalesPerDay}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded p-4 border border-gray-200 mt-4">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Order Calculation</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded font-mono">
                      (Lead time {item.calculation.leadTimeDays}d + Safety 3d + Target 30d) × {item.calculation.avgSalesPerDay} units/day = {Math.round((item.calculation.leadTimeDays + 3 + 30) * item.calculation.avgSalesPerDay)} qty
                      <br />
                      Minus current {item.calculation.currentStock} = <span className="font-bold text-blue-600">{item.calculation.suggestedOrderQty}</span> units to order
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 italic">{item.calculation.reasoning}</p>
                </div>
              ))}
          </div>
        )}

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
    </div>
  );
}
