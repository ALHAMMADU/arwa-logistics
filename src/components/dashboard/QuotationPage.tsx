'use client';

import React, { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  CreditCardIcon, PlusIcon, FilterIcon, SearchIcon,
  PackageIcon, ClockIcon, CheckCircleIcon, XIcon,
  PlaneIcon, ShipIcon, TruckIcon, RefreshIcon,
  ArrowLeftIcon, SendIcon, DollarSignIcon,
  CalendarIcon, MapPinIcon,
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
  LCL: 'LCL (Less than Container)',
  FCL: 'FCL (Full Container)',
};

const STATUS_FLOW = ['PENDING', 'REVIEWED', 'QUOTED', 'ACCEPTED'];

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
  customer: { id: string; name: string; email: string; phone?: string; company?: string };
  reviewedBy: { id: string; name: string; email: string } | null;
}

const initialForm = {
  originCountry: 'China',
  originCity: 'Guangzhou',
  destinationCountry: '',
  destinationCity: '',
  shippingMethod: 'AIR',
  shipmentType: 'PARCEL',
  weight: '',
  length: '',
  width: '',
  height: '',
  commodityType: '',
  specialRequirements: '',
};

export default function QuotationPage() {
  const { user } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    return params.toString();
  }, [statusFilter, search]);

  const { data: quotationsData, loading, refresh } = useFetch<any>(
    () => apiFetch(`/quotations?${buildQuery()}`).then(r => {
      if (r.success) return r.data;
      return null;
    }),
    [buildQuery()]
  );

  const { data: quotationDetail, loading: detailLoading, refresh: refreshDetail } = useFetch<any>(
    () => selectedQuotation ? apiFetch(`/quotations/${selectedQuotation}`).then(r => r.success ? r.data : null) : Promise.resolve(null),
    [selectedQuotation]
  );

  const { data: countriesData } = useFetch<any[]>(
    () => apiFetch('/countries?active=true').then(r => r.success ? r.data : []),
    []
  );

  const countries: any[] = countriesData || [];
  const quotations: QuotationRecord[] = quotationsData?.quotations || [];

  // Stats
  const stats = {
    total: quotations.length,
    pending: quotations.filter(q => q.status === 'PENDING' || q.status === 'REVIEWED').length,
    quoted: quotations.filter(q => q.status === 'QUOTED').length,
    accepted: quotations.filter(q => q.status === 'ACCEPTED').length,
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.destinationCountry || !form.destinationCity) {
      toast.error('Please select a destination country and city');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch('/quotations', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (res.success) {
        toast.success('Quotation request submitted successfully');
        setShowCreate(false);
        setForm(initialForm);
        refresh();
      } else {
        toast.error(res.error || 'Failed to submit quotation');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuotationAction = async (id: string, action: 'ACCEPTED' | 'REJECTED') => {
    setActionLoading(id);
    try {
      const res = await apiFetch(`/quotations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: action }),
      });
      if (res.success) {
        toast.success(`Quotation ${action === 'ACCEPTED' ? 'accepted' : 'rejected'} successfully`);
        refreshDetail();
        refresh();
      } else {
        toast.error(res.error || 'Failed to update quotation');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusFlowIndex = (status: string) => {
    const idx = STATUS_FLOW.indexOf(status);
    return idx >= 0 ? idx : status === 'REJECTED' ? 2 : status === 'EXPIRED' ? -1 : 0;
  };

  const getShippingIcon = (method: string) => {
    switch (method) {
      case 'AIR': return <PlaneIcon className="w-4 h-4" />;
      case 'SEA': return <ShipIcon className="w-4 h-4" />;
      case 'LAND': return <TruckIcon className="w-4 h-4" />;
      default: return <PackageIcon className="w-4 h-4" />;
    }
  };

  // Destination cities based on selected country
  const selectedCountryData = countries.find((c: any) => c.name === form.destinationCountry);
  const destinationCities: string[] = selectedCountryData?.cities || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quotations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Request pricing and manage your quotations</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <RefreshIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" /> New Quotation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: <CreditCardIcon className="w-5 h-5" />, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800' },
          { label: 'Pending', value: stats.pending, icon: <ClockIcon className="w-5 h-5" />, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Quoted', value: stats.quoted, icon: <DollarSignIcon className="w-5 h-5" />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Accepted', value: stats.accepted, icon: <CheckCircleIcon className="w-5 h-5" />, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={s.color}>{s.icon}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{s.label}</span>
            </div>
            <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quotations..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value="">All Statuses</option>
          {Object.entries(QUOTATION_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Create Quotation Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Request Quotation</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Get a price estimate for your shipment</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {/* Origin */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Origin Country</label>
                  <input
                    value={form.originCountry}
                    onChange={e => setForm({ ...form, originCountry: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="China"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Origin City</label>
                  <input
                    value={form.originCity}
                    onChange={e => setForm({ ...form, originCity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="Guangzhou"
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Destination Country *</label>
                  <select
                    value={form.destinationCountry}
                    onChange={e => setForm({ ...form, destinationCountry: e.target.value, destinationCity: '' })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    required
                  >
                    <option value="">Select Country</option>
                    {countries.map((c: any) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Destination City *</label>
                  <input
                    value={form.destinationCity}
                    onChange={e => setForm({ ...form, destinationCity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="Enter city name"
                    required
                  />
                </div>
              </div>

              {/* Shipping Method & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shipping Method *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['AIR', 'SEA', 'LAND'] as const).map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setForm({ ...form, shippingMethod: method })}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                          form.shippingMethod === method
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                        }`}
                      >
                        {getShippingIcon(method)}
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shipment Type *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['PARCEL', 'LCL', 'FCL'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm({ ...form, shipmentType: type })}
                        className={`py-2.5 rounded-lg border text-xs font-medium transition-all ${
                          form.shipmentType === type
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Weight & Dimensions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weight & Dimensions</label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      value={form.weight}
                      onChange={e => setForm({ ...form, weight: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="Weight (kg)"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      value={form.length}
                      onChange={e => setForm({ ...form, length: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="L (cm)"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      value={form.width}
                      onChange={e => setForm({ ...form, width: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="W (cm)"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      value={form.height}
                      onChange={e => setForm({ ...form, height: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      placeholder="H (cm)"
                    />
                  </div>
                </div>
              </div>

              {/* Commodity Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Commodity Type</label>
                <input
                  value={form.commodityType}
                  onChange={e => setForm({ ...form, commodityType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="Description of goods (e.g., Electronics, Clothing, Machinery)"
                />
              </div>

              {/* Special Requirements */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Special Requirements</label>
                <textarea
                  value={form.specialRequirements}
                  onChange={e => setForm({ ...form, specialRequirements: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder-slate-400 dark:placeholder-slate-500"
                  placeholder="Any special requirements (e.g., fragile, temperature controlled, insurance needed)"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                  ) : (
                    <><SendIcon className="w-4 h-4" /> Submit Request</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setForm(initialForm); }}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quotation Detail View */}
      {selectedQuotation && quotationDetail ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setSelectedQuotation(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <span className="text-sm font-mono text-slate-500 dark:text-slate-400">{quotationDetail.quotationId}</span>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${QUOTATION_STATUS_COLORS[quotationDetail.status] || ''}`}>
                {QUOTATION_STATUS_LABELS[quotationDetail.status] || quotationDetail.status}
              </span>
            </div>

            {/* Status Flow */}
            <div className="mt-4">
              <div className="flex items-center gap-1">
                {STATUS_FLOW.map((status, i) => {
                  const currentIdx = getStatusFlowIndex(quotationDetail.status);
                  const isActive = i <= currentIdx && quotationDetail.status !== 'REJECTED' && quotationDetail.status !== 'EXPIRED';
                  const isCurrent = status === quotationDetail.status;
                  return (
                    <React.Fragment key={status}>
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-600 text-slate-400 dark:text-slate-500'
                        } ${isCurrent ? 'ring-3 ring-emerald-500/20' : ''}`}>
                          {isActive && i < currentIdx ? '✓' : i + 1}
                        </div>
                        <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                          {QUOTATION_STATUS_LABELS[status]}
                        </span>
                      </div>
                      {i < STATUS_FLOW.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-5 rounded-full transition-colors ${
                          i < currentIdx ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'
                        }`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              {(quotationDetail.status === 'REJECTED' || quotationDetail.status === 'EXPIRED') && (
                <div className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium ${
                  quotationDetail.status === 'REJECTED'
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  This quotation has been {quotationDetail.status.toLowerCase()}
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Route Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPinIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Origin</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{quotationDetail.originCity}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{quotationDetail.originCountry}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex items-center justify-center">
                <div className="flex items-center gap-3">
                  {getShippingIcon(quotationDetail.shippingMethod)}
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{SHIPPING_METHOD_LABELS[quotationDetail.shippingMethod]}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{SHIPMENT_TYPE_LABELS[quotationDetail.shipmentType]}</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPinIcon className="w-4 h-4 text-red-500 dark:text-red-400" />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Destination</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{quotationDetail.destinationCity}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{quotationDetail.destinationCountry}</p>
              </div>
            </div>

            {/* Quoted Price */}
            {quotationDetail.quotedPrice != null && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 text-center border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase mb-1">Quoted Price</p>
                <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                  ${quotationDetail.quotedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-lg ml-1">{quotationDetail.quotedCurrency}</span>
                </p>
                {quotationDetail.estimatedDays && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                    Estimated delivery: {quotationDetail.estimatedDays} days
                  </p>
                )}
                {quotationDetail.validUntil && (
                  <p className="text-xs text-emerald-500 dark:text-emerald-400/70 mt-1 flex items-center justify-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    Valid until: {new Date(quotationDetail.validUntil).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {quotationDetail.weight && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Weight</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{quotationDetail.weight} kg</p>
                </div>
              )}
              {quotationDetail.length && quotationDetail.width && quotationDetail.height && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Dimensions (L×W×H)</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{quotationDetail.length} × {quotationDetail.width} × {quotationDetail.height} cm</p>
                </div>
              )}
              {quotationDetail.commodityType && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Commodity</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{quotationDetail.commodityType}</p>
                </div>
              )}
              <div>
                <span className="text-slate-500 dark:text-slate-400">Created</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">{new Date(quotationDetail.createdAt).toLocaleDateString()}</p>
              </div>
              {quotationDetail.reviewedBy && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Reviewed By</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{quotationDetail.reviewedBy.name}</p>
                </div>
              )}
              {quotationDetail.reviewedAt && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Reviewed At</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{new Date(quotationDetail.reviewedAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {quotationDetail.specialRequirements && (
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400">Special Requirements</span>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">{quotationDetail.specialRequirements}</p>
              </div>
            )}

            {quotationDetail.notes && (
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400">Notes</span>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">{quotationDetail.notes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          {quotationDetail.status === 'QUOTED' && (
            <div className="flex items-center gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleQuotationAction(quotationDetail.id, 'ACCEPTED')}
                disabled={actionLoading === quotationDetail.id}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading === quotationDetail.id ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4" />
                )}
                Accept Quotation
              </button>
              <button
                onClick={() => handleQuotationAction(quotationDetail.id, 'REJECTED')}
                disabled={actionLoading === quotationDetail.id}
                className="flex-1 px-4 py-2.5 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <XIcon className="w-4 h-4" />
                Reject Quotation
              </button>
            </div>
          )}
        </div>
      ) : !selectedQuotation ? (
        /* Quotation List */
        loading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">Loading...</div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-16">
            <CreditCardIcon className="w-16 h-16 text-slate-200 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No quotations yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Request your first quotation to get started</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors inline-flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" /> New Quotation
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {quotations.map((q) => (
              <div
                key={q.id}
                onClick={() => setSelectedQuotation(q.id)}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-all cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{q.quotationId}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${QUOTATION_STATUS_COLORS[q.status] || ''}`}>
                        {QUOTATION_STATUS_LABELS[q.status] || q.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 mb-1">
                      <span className="font-medium">{q.originCity}</span>
                      <span className="text-slate-400 dark:text-slate-500">→</span>
                      {getShippingIcon(q.shippingMethod)}
                      <span className="text-slate-400 dark:text-slate-500">→</span>
                      <span className="font-medium">{q.destinationCity}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>{SHIPPING_METHOD_LABELS[q.shippingMethod]}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>{SHIPMENT_TYPE_LABELS[q.shipmentType]}</span>
                      {q.weight && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span>{q.weight} kg</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {q.quotedPrice != null ? (
                      <div>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">${q.quotedPrice.toFixed(2)}</p>
                        {q.estimatedDays && <p className="text-xs text-slate-500 dark:text-slate-400">{q.estimatedDays} days</p>}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-500">Awaiting quote</p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(q.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Action buttons for QUOTED status */}
                {q.status === 'QUOTED' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleQuotationAction(q.id, 'ACCEPTED')}
                      disabled={actionLoading === q.id}
                      className="flex-1 text-xs px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-medium transition-colors disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleQuotationAction(q.id, 'REJECTED')}
                      disabled={actionLoading === q.id}
                      className="flex-1 text-xs px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 font-medium transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">Loading details...</div>
      )}
    </div>
  );
}
