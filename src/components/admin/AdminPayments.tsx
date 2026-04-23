'use client';

import React, { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { toast } from 'sonner';
import { CreditCardIcon, DollarSignIcon, ReceiptIcon, RefreshIcon, FilterIcon, CheckCircleIcon, ClockIcon, XIcon } from '@/components/icons';
import AutoRefresh from '@/components/shared/AutoRefresh';
import ExportButton from '@/components/shared/ExportButton';
import { useAppStore } from '@/lib/store';

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  REFUNDED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CREDIT_CARD: 'Credit Card',
  BANK_TRANSFER: 'Bank Transfer',
  WALLET: 'Digital Wallet',
  CASH: 'Cash',
};

interface PaymentRecord {
  id: string;
  paymentId: string;
  shipmentId: string;
  userId: string;
  amount: number;
  subtotal: number;
  handlingFee: number;
  insuranceFee: number;
  currency: string;
  method: string;
  status: string;
  transactionRef: string | null;
  cardLast4: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  notes: string | null;
  createdAt: string;
  shipment: {
    shipmentId: string;
    trackingNumber: string;
    destinationCity: string;
    destinationCountry: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function AdminPayments() {
  const { setSelectedShipmentId, setCurrentPage } = useAppStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (methodFilter) params.set('method', methodFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (search) params.set('search', search);
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    return params.toString();
  }, [statusFilter, methodFilter, startDate, endDate, search, page, limit]);

  const { data: paymentData, loading, refresh: loadPayments } = useFetch<any>(
    () => apiFetch(`/payments?${buildQuery()}`).then(r => {
      if (r.success) {
        setLastUpdated(new Date());
        return r.data;
      }
      return null;
    }),
    [buildQuery()]
  );

  const payments: PaymentRecord[] = paymentData?.payments || [];
  const total = paymentData?.total || 0;
  const pages = paymentData?.pages || 1;
  const currentPage = paymentData?.page || 1;

  // Stats
  const { data: allPaymentsData } = useFetch<any>(
    () => apiFetch('/payments?limit=1000').then(r => r.success ? r.data : null),
    []
  );

  const allPayments: PaymentRecord[] = allPaymentsData?.payments || [];
  const totalRevenue = allPayments.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0);
  const pendingCount = allPayments.filter(p => p.status === 'PENDING').length;
  const completedCount = allPayments.filter(p => p.status === 'COMPLETED').length;
  const refundedCount = allPayments.filter(p => p.status === 'REFUNDED').length;

  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

  const handleStatusFilter = (val: string) => { setStatusFilter(val); setPage(1); };
  const handleMethodFilter = (val: string) => { setMethodFilter(val); setPage(1); };
  const handleStartDate = (val: string) => { setStartDate(val); setPage(1); };
  const handleEndDate = (val: string) => { setEndDate(val); setPage(1); };
  const handleSearch = (val: string) => { setSearch(val); setPage(1); };

  const clearFilters = () => {
    setStatusFilter('');
    setMethodFilter('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter || methodFilter || startDate || endDate || search;

  const updatePaymentStatus = async (id: string, status: string) => {
    try {
      const res = await apiFetch(`/payments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      if (res.success) {
        toast.success(`Payment ${status.toLowerCase()} successfully`);
        loadPayments();
        if (showDetailModal && selectedPayment?.id === id) {
          setSelectedPayment(res.data);
        }
      } else {
        toast.error(res.error || 'Failed to update payment');
      }
    } catch {
      toast.error('Failed to update payment');
    }
  };

  const openDetail = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
  };

  const viewShipmentPayment = (payment: PaymentRecord) => {
    setSelectedShipmentId(payment.shipmentId);
    setCurrentPage('payment');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Payments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and track all payment transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <AutoRefresh onRefresh={loadPayments} lastUpdated={lastUpdated} />
          <ExportButton />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <DollarSignIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Revenue</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <ClockIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pending</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{completedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30">
              <ReceiptIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Refunded</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{refundedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => handleStatusFilter('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>All ({total})</button>
        {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => handleStatusFilter(key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === key ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>{label}</button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <FilterIcon className="w-4 h-4" /> Filters
          </h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium transition-colors">
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Payment ID, name..."
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Method</label>
            <select
              value={methodFilter}
              onChange={(e) => handleMethodFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            >
              <option value="">All Methods</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">Loading...</div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3 mt-4">
            {payments.map((p) => (
              <div key={p.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm" onClick={() => openDetail(p)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">{p.paymentId}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{p.shipment?.shipmentId || '-'}</div>
                  </div>
                  <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${PAYMENT_STATUS_COLORS[p.status] || ''}`}>
                    {PAYMENT_STATUS_LABELS[p.status] || p.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="text-slate-400 dark:text-slate-500">Customer: </span>
                    {p.user?.name || '-'}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="text-slate-400 dark:text-slate-500">Method: </span>
                    {PAYMENT_METHOD_LABELS[p.method] || p.method}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">${p.amount.toFixed(2)}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  {p.status === 'PENDING' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updatePaymentStatus(p.id, 'PROCESSING'); }}
                      className="flex-1 text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 font-medium transition-colors"
                    >
                      Process
                    </button>
                  )}
                  {p.status === 'PROCESSING' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updatePaymentStatus(p.id, 'COMPLETED'); }}
                      className="flex-1 text-xs px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-medium transition-colors"
                    >
                      Complete
                    </button>
                  )}
                  {p.status === 'COMPLETED' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updatePaymentStatus(p.id, 'REFUNDED'); }}
                      className="flex-1 text-xs px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 font-medium transition-colors"
                    >
                      Refund
                    </button>
                  )}
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">No payments found</div>
            )}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mt-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Payment ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Shipment</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Method</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                      onClick={() => openDetail(p)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm text-slate-900 dark:text-slate-100">{p.paymentId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-700 dark:text-slate-300">{p.shipment?.shipmentId || '-'}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{p.shipment?.destinationCity || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{p.user?.name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">${p.amount.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <CreditCardIcon className="w-3.5 h-3.5 text-slate-400" />
                          {PAYMENT_METHOD_LABELS[p.method] || p.method}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${PAYMENT_STATUS_COLORS[p.status] || ''}`}>
                          {PAYMENT_STATUS_LABELS[p.status] || p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {p.status === 'PENDING' && (
                            <button
                              onClick={() => updatePaymentStatus(p.id, 'PROCESSING')}
                              className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 font-medium transition-colors"
                            >
                              Process
                            </button>
                          )}
                          {p.status === 'PROCESSING' && (
                            <button
                              onClick={() => updatePaymentStatus(p.id, 'COMPLETED')}
                              className="text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-medium transition-colors"
                            >
                              Complete
                            </button>
                          )}
                          {p.status === 'COMPLETED' && (
                            <button
                              onClick={() => updatePaymentStatus(p.id, 'REFUNDED')}
                              className="text-xs px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/40 font-medium transition-colors"
                            >
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing <span className="font-medium text-slate-700 dark:text-slate-300">{startItem}</span> to <span className="font-medium text-slate-700 dark:text-slate-300">{endItem}</span> of <span className="font-medium text-slate-700 dark:text-slate-300">{total}</span> payments
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (pages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pages - 2) {
                    pageNum = pages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${currentPage === pageNum ? 'bg-emerald-600 text-white' : 'border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={currentPage >= pages}
                  className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Payment Details</h3>
                <p className="text-sm font-mono text-slate-500 dark:text-slate-400">{selectedPayment.paymentId}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${PAYMENT_STATUS_COLORS[selectedPayment.status] || ''}`}>
                  {PAYMENT_STATUS_LABELS[selectedPayment.status] || selectedPayment.status}
                </span>
              </div>

              {/* Amount */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Amount</p>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">${selectedPayment.amount.toFixed(2)}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500">Subtotal</p>
                    <p className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100">${selectedPayment.subtotal.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500">Handling (5%)</p>
                    <p className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100">${selectedPayment.handlingFee.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500">Insurance (1%)</p>
                    <p className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100">${selectedPayment.insuranceFee.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Customer</span>
                  <span className="text-slate-900 dark:text-slate-100">{selectedPayment.user?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Email</span>
                  <span className="text-slate-900 dark:text-slate-100">{selectedPayment.user?.email || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Shipment</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">{selectedPayment.shipment?.shipmentId || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Destination</span>
                  <span className="text-slate-900 dark:text-slate-100">{selectedPayment.shipment?.destinationCity}, {selectedPayment.shipment?.destinationCountry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Method</span>
                  <span className="text-slate-900 dark:text-slate-100">{PAYMENT_METHOD_LABELS[selectedPayment.method] || selectedPayment.method}</span>
                </div>
                {selectedPayment.transactionRef && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Transaction Ref</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">{selectedPayment.transactionRef}</span>
                  </div>
                )}
                {selectedPayment.cardLast4 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Card</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">•••• {selectedPayment.cardLast4}</span>
                  </div>
                )}
                {selectedPayment.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Paid At</span>
                    <span className="text-slate-900 dark:text-slate-100">{new Date(selectedPayment.paidAt).toLocaleString()}</span>
                  </div>
                )}
                {selectedPayment.refundedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Refunded At</span>
                    <span className="text-slate-900 dark:text-slate-100">{new Date(selectedPayment.refundedAt).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Created</span>
                  <span className="text-slate-900 dark:text-slate-100">{new Date(selectedPayment.createdAt).toLocaleString()}</span>
                </div>
                {selectedPayment.notes && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Notes</span>
                    <span className="text-slate-900 dark:text-slate-100">{selectedPayment.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              {selectedPayment.status === 'PENDING' && (
                <button
                  onClick={() => { updatePaymentStatus(selectedPayment.id, 'PROCESSING'); }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium transition-colors"
                >
                  Process Payment
                </button>
              )}
              {selectedPayment.status === 'PROCESSING' && (
                <button
                  onClick={() => { updatePaymentStatus(selectedPayment.id, 'COMPLETED'); }}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors"
                >
                  Mark Completed
                </button>
              )}
              {selectedPayment.status === 'COMPLETED' && (
                <button
                  onClick={() => { updatePaymentStatus(selectedPayment.id, 'REFUNDED'); }}
                  className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 text-sm font-medium transition-colors"
                >
                  Issue Refund
                </button>
              )}
              <button
                onClick={() => { viewShipmentPayment(selectedPayment); setShowDetailModal(false); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                View in Customer View
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
