'use client';

import { useEffect, useState } from 'react';
import { getCustomerAging, getRiskIcon, getRiskLabel, CustomerAgingResponse, CustomerAgingFilters } from '@/api/reports';
import Loading from '@/components/Loading';
import ErrorView from '@/components/Error';

interface Props {
  shopId?: string;
}

export default function CustomerAgingReport({ shopId }: Props) {
  const [data, setData] = useState<CustomerAgingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CustomerAgingFilters>({
    shopId,
    showOverdueOnly: false,
    sortBy: 'riskScore',
    page: 1,
    limit: 50,
  });
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getCustomerAging(filters);
        setData(response);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch customer aging report');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const handleSortChange = (sortBy: 'totalOutstanding' | 'overdueAmount' | 'riskScore') => {
    setFilters({ ...filters, sortBy, page: 1 });
  };

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} />;
  if (!data) return <ErrorView message="No data available" />;

  const overduePct = data.summary.totalOutstanding > 0 ? (data.summary.totalOverdue / data.summary.totalOutstanding) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Aging Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Track outstanding payments by age bracket</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
          <p className="text-2xl font-bold text-foreground">{data.summary.totalCustomers}</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-bold text-foreground">₹{(data.summary.totalOutstanding / 100000).toFixed(1)}L</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-sm font-medium text-muted-foreground">Overdue</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">₹{(data.summary.totalOverdue / 100000).toFixed(1)}L</p>
          <p className="text-xs text-muted-foreground mt-1">{overduePct.toFixed(0)}% of total</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-sm font-medium text-muted-foreground">Overdue Customers</p>
          <p className="text-2xl font-bold text-foreground">{data.summary.overdueCustomers}</p>
        </div>
        <div className="bg-card rounded-lg shadow p-4 border-l-4 border-purple-500">
          <p className="text-sm font-medium text-muted-foreground">Avg Collection Days</p>
          <p className="text-2xl font-bold text-foreground">{data.summary.avgCollectionDays}</p>
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
              onChange={(e) => handleSortChange(e.target.value as 'totalOutstanding' | 'overdueAmount' | 'riskScore')}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="riskScore">Risk Level (High to Low)</option>
              <option value="overdueAmount">Overdue Amount (High to Low)</option>
              <option value="totalOutstanding">Total Outstanding (High to Low)</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={filters.showOverdueOnly || false}
                onChange={(e) => setFilters({ ...filters, showOverdueOnly: e.target.checked, page: 1 })}
                className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded border-border"
              />
              Show overdue only
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
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">0-30 Days</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">31-60 Days</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">61-90 Days</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">90+ Days</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-foreground uppercase tracking-wider">Collection %</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-foreground uppercase tracking-wider">Risk</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-foreground uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                    No customers found
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <>
                    <tr key={item.customerId} className="hover:bg-muted">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{item.customerName}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-green-600 dark:text-green-400">
                        ₹{(item.agingBuckets.current_0_30 / 100000).toFixed(2)}L
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-yellow-600 dark:text-yellow-400">
                        ₹{(item.agingBuckets.watch_31_60 / 100000).toFixed(2)}L
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-orange-600 dark:text-orange-400">
                        ₹{(item.agingBuckets.highRisk_61_90 / 100000).toFixed(2)}L
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-red-600 dark:text-red-400">
                        ₹{(item.agingBuckets.critical_90plus / 100000).toFixed(2)}L
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-foreground">
                        ₹{(item.totalOutstanding / 100000).toFixed(2)}L
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-foreground">
                        {item.collectionPercentage}%
                      </td>
                      <td className="px-6 py-4 text-center text-lg">{getRiskIcon(item.riskScore)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setExpandedCustomer(expandedCustomer === item.customerId ? null : item.customerId)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium"
                        >
                          {expandedCustomer === item.customerId ? '▼' : '▶'}
                        </button>
                      </td>
                    </tr>
                    {expandedCustomer === item.customerId && (
                      <tr className="bg-blue-50 dark:bg-blue-500/10">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-card rounded p-3 border border-border">
                                <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
                                <p className="text-lg font-bold text-foreground mt-1">{getRiskLabel(item.riskScore)}</p>
                              </div>
                              <div className="bg-card rounded p-3 border border-border">
                                <p className="text-sm font-medium text-muted-foreground">Overdue Invoices</p>
                                <p className="text-lg font-bold text-foreground mt-1">{item.overdueInvoiceCount}</p>
                              </div>
                              <div className="bg-card rounded p-3 border border-border">
                                <p className="text-sm font-medium text-muted-foreground">Avg Payment Days</p>
                                <p className="text-lg font-bold text-foreground mt-1">{item.avgPaymentDays}</p>
                              </div>
                            </div>

                            <div className="bg-card rounded p-4 border border-border">
                              <p className="text-sm font-semibold text-foreground mb-3">Suggested Actions</p>
                              <ul className="space-y-2">
                                {item.actions.map((action, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                                    <span className="mt-0.5">→</span>
                                    <span>{action}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {item.lastTransactionDate && (
                              <p className="text-xs text-muted-foreground">
                                Last transaction: {new Date(item.lastTransactionDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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

      {/* Key Insights */}
      {data.summary.overdueCustomers > 0 && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 mb-2">⚠️ Attention Required</h3>
          <p className="text-sm text-red-800 dark:text-red-300">
            {data.summary.overdueCustomers} customer(s) with overdue payments totaling ₹{(data.summary.totalOverdue / 100000).toFixed(1)}L.
            Collection action recommended.
          </p>
        </div>
      )}
    </div>
  );
}
