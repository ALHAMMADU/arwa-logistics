'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import {
  GlobeIcon, PlusIcon, XIcon, RefreshIcon,
  PlaneIcon, TruckIcon, EditIcon, SearchIcon,
  DollarSignIcon, ClockIcon, MapPinIcon, ShipIcon,
} from '@/components/icons';

export default function AdminRoutes() {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [form, setForm] = useState({
    name: '', originCountry: 'China', destinationCountry: '', destinationCity: '',
    pricePerKg: '', estimatedDaysMin: '5', estimatedDaysMax: '10',
    allowedAir: true, allowedSea: true, allowedLand: false,
  });

  const { data: routes, loading, refresh } = useFetch<any[]>(
    () => apiFetch('/routes').then(r => r.success ? r.data : []),
    []
  );

  const filtered = (routes || []).filter((r: any) => {
    const matchesSearch = !search || r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.destinationCountry?.toLowerCase().includes(search.toLowerCase());
    const matchesMethod = !methodFilter ||
      (methodFilter === 'AIR' && r.allowedAir) ||
      (methodFilter === 'SEA' && r.allowedSea) ||
      (methodFilter === 'LAND' && r.allowedLand);
    return matchesSearch && matchesMethod;
  });

  const stats = {
    total: (routes || []).length,
    active: (routes || []).filter((r: any) => r.active).length,
    avgPrice: (routes || []).length > 0
      ? ((routes || []).reduce((sum: number, r: any) => sum + (r.pricePerKg || 0), 0) / (routes || []).length).toFixed(2)
      : '0',
    topDestination: (() => {
      const counts: Record<string, number> = {};
      (routes || []).forEach((r: any) => {
        counts[r.destinationCountry] = (counts[r.destinationCountry] || 0) + 1;
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    })(),
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/routes', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          pricePerKg: parseFloat(form.pricePerKg),
          estimatedDaysMin: parseInt(form.estimatedDaysMin),
          estimatedDaysMax: parseInt(form.estimatedDaysMax),
        }),
      });
      if (res.success) {
        toast.success(t('common.success'));
        setShowForm(false);
        setForm({ name: '', originCountry: 'China', destinationCountry: '', destinationCity: '', pricePerKg: '', estimatedDaysMin: '5', estimatedDaysMax: '10', allowedAir: true, allowedSea: true, allowedLand: false });
        refresh();
      } else {
        toast.error(res.error || t('common.error'));
      }
    } catch {
      toast.error(t('errors.networkError'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await apiFetch(`/routes/${id}`, { method: 'DELETE' });
      if (res.success) {
        toast.success('Route deactivated');
        refresh();
      }
    } catch {
      toast.error(t('errors.networkError'));
    }
  };

  const openEdit = (r: any) => {
    setEditId(r.id);
    setForm({
      name: r.name,
      originCountry: r.originCountry,
      destinationCountry: r.destinationCountry,
      destinationCity: r.destinationCity || '',
      pricePerKg: String(r.pricePerKg),
      estimatedDaysMin: String(r.estimatedDaysMin),
      estimatedDaysMax: String(r.estimatedDaysMax),
      allowedAir: r.allowedAir,
      allowedSea: r.allowedSea,
      allowedLand: r.allowedLand,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.manageRoutes')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('admin.manageRoutes')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshIcon className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', originCountry: 'China', destinationCountry: '', destinationCity: '', pricePerKg: '', estimatedDaysMin: '5', estimatedDaysMax: '10', allowedAir: true, allowedSea: true, allowedLand: false }); }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" /> {t('admin.createRoute')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('common.total') || 'Total', value: stats.total, icon: <GlobeIcon className="w-5 h-5" />, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: t('common.active') || 'Active', value: stats.active, icon: <GlobeIcon className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
          { label: t('admin.pricePerKg') || 'Avg $/kg', value: `$${stats.avgPrice}`, icon: <DollarSignIcon className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: t('analytics.topDestinations') || 'Top Dest.', value: stats.topDestination, icon: <MapPinIcon className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={s.color}>{s.icon}</span>
              <span className="text-sm text-slate-500">{s.label}</span>
            </div>
            <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('common.search') || 'Search routes...'}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
        </div>
        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700">
          <option value="">{t('common.all') || 'All Methods'}</option>
          <option value="AIR">{t('landing.airFreight') || 'Air'}</option>
          <option value="SEA">{t('landing.seaFreight') || 'Sea'}</option>
          <option value="LAND">{t('landing.landFreight') || 'Land'}</option>
        </select>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">{editId ? t('common.edit') : t('admin.createRoute')}</h3>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-slate-400 hover:text-slate-600">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.name')} *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="e.g. China → Saudi Arabia" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('shipment.origin')} *</label>
                  <input value={form.originCountry} onChange={e => setForm({ ...form, originCountry: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('shipment.destination')} *</label>
                  <input value={form.destinationCountry} onChange={e => setForm({ ...form, destinationCountry: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.pricePerKg')} (USD) *</label>
                  <input type="number" step="0.01" value={form.pricePerKg} onChange={e => setForm({ ...form, pricePerKg: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.estimatedDays')} Min</label>
                  <input type="number" value={form.estimatedDaysMin} onChange={e => setForm({ ...form, estimatedDaysMin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.estimatedDays')} Max</label>
                  <input type="number" value={form.estimatedDaysMax} onChange={e => setForm({ ...form, estimatedDaysMax: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('shipment.method') || 'Shipping Methods'}</label>
                <div className="flex gap-3">
                  {[
                    { key: 'allowedAir', label: t('landing.airFreight') || 'Air', icon: <PlaneIcon className="w-4 h-4" /> },
                    { key: 'allowedSea', label: t('landing.seaFreight') || 'Sea', icon: <ShipIcon className="w-4 h-4" /> },
                    { key: 'allowedLand', label: t('landing.landFreight') || 'Land', icon: <TruckIcon className="w-4 h-4" /> },
                  ].map(m => (
                    <label key={m.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      form[m.key as keyof typeof form] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'
                    }`}>
                      <input type="checkbox" checked={form[m.key as keyof typeof form] as boolean}
                        onChange={e => setForm({ ...form, [m.key]: e.target.checked })} className="rounded" />
                      {m.icon}
                      <span className="text-sm text-slate-700">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium">
                  {editId ? t('common.update') : t('common.create')}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm">
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Route Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">{t('admin.noRoutes')}</div>
        ) : (
          filtered.map((r: any) => (
            <div key={r.id} className={`bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow ${!r.active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-900">{r.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{r.originCountry} → {r.destinationCountry}{r.destinationCity ? `, ${r.destinationCity}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(r)} className="text-slate-400 hover:text-emerald-600">
                    <EditIcon className="w-4 h-4" />
                  </button>
                  {r.active && (
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:text-red-700">Deactivate</button>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1"><DollarSignIcon className="w-4 h-4" /> {t('admin.pricePerKg')}</span>
                  <span className="font-semibold text-emerald-600">${r.pricePerKg}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1"><ClockIcon className="w-4 h-4" /> {t('admin.estimatedDays')}</span>
                  <span className="text-slate-700">{r.estimatedDaysMin}-{r.estimatedDaysMax} {t('calculator.days') || 'days'}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {r.allowedAir && <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-xs rounded flex items-center gap-1"><PlaneIcon className="w-3 h-3" /> Air</span>}
                  {r.allowedSea && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded flex items-center gap-1"><ShipIcon className="w-3 h-3" /> Sea</span>}
                  {r.allowedLand && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded flex items-center gap-1"><TruckIcon className="w-3 h-3" /> Land</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
