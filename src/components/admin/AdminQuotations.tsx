'use client';

import React, { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import AutoRefresh from '@/components/shared/AutoRefresh';
import ExportButton from '@/components/shared/ExportButton';
import {
  CreditCardIcon, DollarSignIcon, ReceiptIcon, RefreshIcon, FilterIcon,
  CheckCircleIcon, ClockIcon, XIcon, SearchIcon, PlaneIcon, ShipIcon,
  TruckIcon, PackageIcon, CalendarIcon, MapPinIcon, SendIcon,
  EyeIcon,
} from '@/components/icons';

const QUOTATION_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  REVIEWED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  QUOTED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  EXPIRED: 'bg-slate-100 text-slate-800 dark:bg-slate-700/30 dark:text-slate-300',
};

const QUOTATION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  REVIEWED: 'Reviewed',
  QUOTED: 'Quoted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

const SHIPPING_METHOD_LABELS: Record<string, string> = {
  AIR: 'Air Freight',
  SEA: 'Sea Freight',
  LAND: 'Land Transport',
};

const SHIPMENT_TYPE_LABELS: Record<string, string> = {
  PARCEL: 'Parcel',
  LCL: 'LCL',
  FCL: 'FCL',
};

interface QuotationRecord {
  id: string;
  quotationId: string;
  customerId: string;
  status: string;
  originCountry: string;
  originCity: string;
  destinationCountry: string;
  destinationCity: string;
  shippingMethod: string;
  shipmentType: string;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  commodityType: string | null;
  specialRequirements: string | null;
  quotedPrice: number | null;
  quotedCurrency: string;
  estimatedDays: number | null;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedById: string | null;
  customer: { id: string; name: string; email: string; phone?: string; company?: string };
  reviewedBy: { id: string; name: string; email: string } | null;
}

export default function AdminQuotations() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationRecord | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ quotedPrice: '', estimatedDays: '', validUntil: '', notes: '' });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    return params.toString();
  }, [statusFilter, search, startDate, endDate, page, limit]);

  const { data: quotationsData, loading, refresh: loadQuotations } = useFetch<any>(
    () => apiFetch(`/quotations?${buildQuery()}`).then(r => {
      if (r.success) {
        setLastUpdated(new Date());
        return r.data;
      }
      return null;
    }),
    [buildQuery()]
  );

  // Stats data
  const { data: allQuotationsData } = useFetch<any>(
    () => apiFetch('/quotations?limit=1000').then(r => r.success ? r.data : null),
    []
  );

  const quotations: QuotationRecord[] = quotationsData?.quotations || [];
  const total = quotationsData?.total || 0;
  const pages = quotationsData?.pages || 1;
  const currentPage = quotationsData?.page || 1;
  const allQuotations: QuotationRecord[] = allQuotationsData?.quotations || [];

  const pendingCount = allQuotations.filter(q => q.status === 'PENDING').length;
  const quotedCount = allQuotations.filter(q => q.status === 'QUOTED').length;
  const acceptedCount = allQuotations.filter(q => q.status === 'ACCEPTED').length;
  const rejectedCount = allQuotations.filter(q => q.status === 'REJECTED').length;
  const totalQuotedValue = allQuotations.filter(q => q.status === 'ACCEPTED' && q.quotedPrice).reduce((sum, q) => sum + (q.quotedPrice || 0), 0);

  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

  const handleStatusFilter = (val: string) => { setStatusFilter(val); setPage(1); };
  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const handleStartDate = (val: string) => { setStartDate(val); setPage(1); };
  const handleEndDate = (val: string) => { setEndDate(val); setPage(1); };

  const clearFilters = () => {
    setStatusFilter('');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter || search || startDate || endDate;

  const updateQuotationStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const res = await apiFetch(`/quotations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      if (res.success) {
        toast.success(`Quotation marked as ${status.toLowerCase()}`);
        loadQuotations();
        if (selectedQuotation?.id === id) {
          setSelectedQuotation(res.data);
        }
      } else {
        toast.error(res.error || 'Failed to update quotation');
      }
    } catch {
      toast.error('Failed to update quotation');
    } finally {
      setActionLoading(null);
    }
  };

  const openQuoteModal = (quotation: QuotationRecord) => {
    setSelectedQuotation(quotation);
    setQuoteForm({
      quotedPrice: quotation.quotedPrice?.toString() || '',
      estimatedDays: quotation.estimatedDays?.toString() || '',
      validUntil: quotation.validUntil ? new Date(quotation.validUntil).toISOString().split('T')[0] : '',
      notes: quotation.notes || '',
    });
    setShowQuoteModal(true);
  };

  const openDetail = (quotation: QuotationRecord) => {
    setSelectedQuotation(quotation);
  };

  const submitQuote = async () => {
    if (!selectedQuotation) return;
    if (!quoteForm.quotedPrice) {
      toast.error('Please enter a quoted price');
      return;
    }
    setActionLoading(selectedQuotation.id);
    try {
      const res = await apiFetch(`/quotations/${selectedQuotation.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          quotedPrice: parseFloat(quoteForm.quotedPrice),
          estimatedDays: quoteForm.estimatedDays ? parseInt(quoteForm.estimatedDays) : null,
          validUntil: quoteForm.validUntil || null,
          notes: quoteForm.notes || null,
          status: 'QUOTED',
        }),
      });
      if (res.success) {
        toast.success('Quotation sent to customer');
        setShowQuoteModal(false);
        loadQuotations();
        setSelectedQuotation(res.data);
      } else {
        toast.error(res.error || 'Failed to submit quote');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const bulkMarkExpired = async () => {
    const pendingQuotations = quotations.filter(q => q.status === 'PENDING' || q.status === 'REVIEWED' || q.status === 'QUOTED');
    let successCount = 0;
    for (const q of pendingQuotations) {
      try {
        const res = await apiFetch(`/quotations/${q.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'EXPIRED' }),
        });
        if (res.success) successCount++;
      } catch { /* skip */ }
    }
    toast.success(`${successCount} quotations marked as expired`);
    loadQuotations();
  };

  const getShippingIcon = (method: string) => {
    switch (method) {
      case 'AIR': return <PlaneIcon className="w-4 h-4" />;
      case 'SEA': return <ShipIcon className="w-4 h-4" />;
      case 'LAND': return <TruckIcon className="w-4 h-4" />;
      default: return <PackageIcon className="w-4 h-4" />;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quotations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage quotation requests and pricing</p>
        </div>
        <div className="flex items-center gap-3">
          <AutoRefresh onRefresh={loadQuotations} lastUpdated={lastUpdated} />
          <ExportButton />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700">
              <ReceiptIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{allQuotations.length}</p>
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
              <SendIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Quoted</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{quotedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30">
              <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Accepted</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{acceptedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <DollarSignIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Revenue (Accepted)</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${totalQuotedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => handleStatusFilter('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>All ({allQuotations.length})</button>
        {Object.entries(QUOTATION_STATUS_LABELS).map(([key, label]) => (
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
              placeholder="ID, country, city..."
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
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
          <div className="flex items-end">
            <button
              onClick={bulkMarkExpired}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Mark Expired (visible)
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">Loading...</div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3 mt-4">
            {quotations.map((q) => (
              <div key={q.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm" onClick={() => openDetail(q)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">{q.quotationId}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{q.customer?.name || '-'}</div>
                  </div>
                  <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${QUOTATION_STATUS_COLORS[q.status] || ''}`}>
                    {QUOTATION_STATUS_LABELS[q.status] || q.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="text-slate-400 dark:text-slate-500">Route: </span>
                    {q.originCity} → {q.destinationCity}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="text-slate-400 dark:text-slate-500">Method: </span>
                    {SHIPPING_METHOD_LABELS[q.shippingMethod] || q.shippingMethod}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {q.quotedPrice != null ? (
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">${q.quotedPrice.toFixed(2)}</span>
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">Awaiting quote</span>
                  )}
                  <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(q.createdAt).toLocaleDateString()}</span>
                </div>
                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  {(q.status === 'PENDING' || q.status === 'REVIEWED') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openQuoteModal(q); }}
                      className="flex-1 text-xs px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-medium transition-colors"
                    >
                      Send Quote
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); openDetail(q); }}
                    className="flex-1 text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 font-medium transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
            {quotations.length === 0 && (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">No quotations found</div>
            )}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mt-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Quotation ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Route</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Method</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Price</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {quotations.map((q) => (
                    <tr
                      key={q.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                      onClick={() => openDetail(q)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm text-slate-900 dark:text-slate-100">{q.quotationId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-700 dark:text-slate-300">{q.customer?.name || '-'}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{q.customer?.company || q.customer?.email || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-700 dark:text-slate-300">
                          {q.originCity} → {q.destinationCity}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          {q.originCountry} → {q.destinationCountry}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          {getShippingIcon(q.shippingMethod)}
                          {SHIPPING_METHOD_LABELS[q.shippingMethod] || q.shippingMethod}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {q.quotedPrice != null ? (
                          <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">${q.quotedPrice.toFixed(2)}</span>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${QUOTATION_STATUS_COLORS[q.status] || ''}`}>
                          {QUOTATION_STATUS_LABELS[q.status] || q.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{new Date(q.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {(q.status === 'PENDING' || q.status === 'REVIEWED') && (
                            <button
                              onClick={() => openQuoteModal(q)}
                              className="text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-medium transition-colors"
                            >
                              Quote
                            </button>
                          )}
                          {q.status === 'QUOTED' && (
                            <button
                              onClick={() => updateQuotationStatus(q.id, 'EXPIRED')}
                              disabled={actionLoading === q.id}
                              className="text-xs px-2.5 py-1 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 font-medium transition-colors disabled:opacity-50"
                            >
                              Expire
                            </button>
                          )}
                          <button
                            onClick={() => openDetail(q)}
                            className="text-xs px-2.5 py-1 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 font-medium transition-colors"
                          >
                            View
                          </button>
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
                Showing <span className="font-medium text-slate-700 dark:text-slate-300">{startItem}</span> to <span className="font-medium text-slate-700 dark:text-slate-300">{endItem}</span> of <span className="font-medium text-slate-700 dark:text-slate-300">{total}</span> quotations
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
      {selectedQuotation && !showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Quotation Details</h3>
                <p className="text-sm font-mono text-slate-500 dark:text-slate-400">{selectedQuotation.quotationId}</p>
              </div>
              <button
                onClick={() => setSelectedQuotation(null)}
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
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${QUOTATION_STATUS_COLORS[selectedQuotation.status] || ''}`}>
                  {QUOTATION_STATUS_LABELS[selectedQuotation.status] || selectedQuotation.status}
                </span>
              </div>

              {/* Customer */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase font-medium">Customer</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedQuotation.customer?.name || '-'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedQuotation.customer?.email || '-'}</p>
                {selectedQuotation.customer?.company && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedQuotation.customer.company}</p>
                )}
              </div>

              {/* Route */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Origin</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedQuotation.originCity}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{selectedQuotation.originCountry}</p>
                </div>
                <div className="text-center flex flex-col items-center justify-center">
                  {getShippingIcon(selectedQuotation.shippingMethod)}
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {SHIPPING_METHOD_LABELS[selectedQuotation.shippingMethod]}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {SHIPMENT_TYPE_LABELS[selectedQuotation.shipmentType]}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Destination</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedQuotation.destinationCity}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{selectedQuotation.destinationCountry}</p>
                </div>
              </div>

              {/* Quoted Price */}
              {selectedQuotation.quotedPrice != null ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 text-center border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase mb-1">Quoted Price</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                    ${selectedQuotation.quotedPrice.toFixed(2)} {selectedQuotation.quotedCurrency}
                  </p>
                  {selectedQuotation.estimatedDays && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                      Est. delivery: {selectedQuotation.estimatedDays} days
                    </p>
                  )}
                  {selectedQuotation.validUntil && (
                    <p className="text-xs text-emerald-500 dark:text-emerald-400/70 mt-1 flex items-center justify-center gap-1">
                      <CalendarIcon className="w-3 h-3" />
                      Valid until: {new Date(selectedQuotation.validUntil).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No price quoted yet</p>
                </div>
              )}

              {/* Details */}
              <div className="space-y-3 text-sm">
                {selectedQuotation.weight != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Weight</span>
                    <span className="text-slate-900 dark:text-slate-100">{selectedQuotation.weight} kg</span>
                  </div>
                )}
                {selectedQuotation.length != null && selectedQuotation.width != null && selectedQuotation.height != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Dimensions (L×W×H)</span>
                    <span className="text-slate-900 dark:text-slate-100">{selectedQuotation.length} × {selectedQuotation.width} × {selectedQuotation.height} cm</span>
                  </div>
                )}
                {selectedQuotation.commodityType && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Commodity</span>
                    <span className="text-slate-900 dark:text-slate-100">{selectedQuotation.commodityType}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Created</span>
                  <span className="text-slate-900 dark:text-slate-100">{new Date(selectedQuotation.createdAt).toLocaleString()}</span>
                </div>
                {selectedQuotation.reviewedBy && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Reviewed By</span>
                    <span className="text-slate-900 dark:text-slate-100">{selectedQuotation.reviewedBy.name}</span>
                  </div>
                )}
                {selectedQuotation.reviewedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Reviewed At</span>
                    <span className="text-slate-900 dark:text-slate-100">{new Date(selectedQuotation.reviewedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {selectedQuotation.specialRequirements && (
                <div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Special Requirements</span>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">{selectedQuotation.specialRequirements}</p>
                </div>
              )}

              {selectedQuotation.notes && (
                <div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Notes</span>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">{selectedQuotation.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              {(selectedQuotation.status === 'PENDING' || selectedQuotation.status === 'REVIEWED') && (
                <button
                  onClick={() => { setShowQuoteModal(true); }}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors"
                >
                  Send Quote
                </button>
              )}
              {selectedQuotation.status === 'PENDING' && (
                <button
                  onClick={() => { updateQuotationStatus(selectedQuotation.id, 'REVIEWED'); }}
                  disabled={actionLoading === selectedQuotation.id}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Mark Reviewed
                </button>
              )}
              <button
                onClick={() => setSelectedQuotation(null)}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quote Modal */}
      {showQuoteModal && selectedQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Send Quotation</h3>
                <p className="text-sm font-mono text-slate-500 dark:text-slate-400">{selectedQuotation.quotationId}</p>
              </div>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Route Summary */}
            <div className="px-5 pt-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                {getShippingIcon(selectedQuotation.shippingMethod)}
                <span className="font-medium">{selectedQuotation.originCity}</span>
                <span className="text-slate-400">→</span>
                <span className="font-medium">{selectedQuotation.destinationCity}</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span>{SHIPPING_METHOD_LABELS[selectedQuotation.shippingMethod]}</span>
              </div>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quoted Price (USD) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={quoteForm.quotedPrice}
                    onChange={e => setQuoteForm({ ...quoteForm, quotedPrice: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estimated Delivery Days</label>
                <input
                  type="number"
                  value={quoteForm.estimatedDays}
                  onChange={e => setQuoteForm({ ...quoteForm, estimatedDays: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="e.g., 7"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valid Until</label>
                <input
                  type="date"
                  value={quoteForm.validUntil}
                  onChange={e => setQuoteForm({ ...quoteForm, validUntil: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                <textarea
                  value={quoteForm.notes}
                  onChange={e => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder-slate-400 dark:placeholder-slate-500"
                  placeholder="Additional notes for the customer..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-2 p-5 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={submitQuote}
                disabled={actionLoading === selectedQuotation.id || !quoteForm.quotedPrice}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading === selectedQuotation.id ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <SendIcon className="w-4 h-4" />
                )}
                Send to Customer
              </button>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
