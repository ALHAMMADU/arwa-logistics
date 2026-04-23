'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import {
  GlobeIcon, PlusIcon, SearchIcon, XIcon,
  PlaneIcon, ShipIcon as SeaIcon, TruckIcon,
  CheckIcon, RefreshIcon, EditIcon,
} from '@/components/icons';

export default function AdminCountries() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', code: '', supportsAir: false, supportsSea: false, supportsLand: false,
  });

  const { data: countries, loading, refresh } = useFetch<any[]>(
    () => apiFetch('/countries').then(r => r.success ? r.data : []),
    []
  );

  const filtered = (countries || []).filter((c: any) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: (countries || []).length,
    active: (countries || []).filter((c: any) => c.active).length,
    airSupport: (countries || []).filter((c: any) => c.supportsAir).length,
    seaSupport: (countries || []).filter((c: any) => c.supportsSea).length,
    landSupport: (countries || []).filter((c: any) => c.supportsLand).length,
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/countries', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (res.success) {
        toast.success(t('common.success'));
        setShowForm(false);
        setForm({ name: '', code: '', supportsAir: false, supportsSea: false, supportsLand: false });
        refresh();
      } else {
        toast.error(res.error || t('common.error'));
      }
    } catch {
      toast.error(t('errors.networkError'));
    }
  };

  const handleToggleSupport = async (id: string, field: string, currentValue: boolean) => {
    try {
      const res = await apiFetch(`/countries/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: !currentValue }),
      });
      if (res.success) refresh();
    } catch {
      toast.error(t('errors.networkError'));
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await apiFetch(`/countries/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !currentActive }),
      });
      if (res.success) {
        toast.success(currentActive ? 'Country deactivated' : 'Country activated');
        refresh();
      }
    } catch {
      toast.error(t('errors.networkError'));
    }
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      code: c.code,
      supportsAir: c.supportsAir,
      supportsSea: c.supportsSea,
      supportsLand: c.supportsLand,
    });
    setShowForm(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    try {
      const res = await apiFetch(`/countries/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      if (res.success) {
        toast.success(t('common.success'));
        setShowForm(false);
        setEditId(null);
        setForm({ name: '', code: '', supportsAir: false, supportsSea: false, supportsLand: false });
        refresh();
      }
    } catch {
      toast.error(t('errors.networkError'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.manageCountries')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('admin.manageCountries')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshIcon className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', code: '', supportsAir: false, supportsSea: false, supportsLand: false }); }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" /> {t('admin.createCountry')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: t('common.total') || 'Total', value: stats.total, icon: <GlobeIcon className="w-5 h-5" />, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: t('common.active') || 'Active', value: stats.active, icon: <CheckIcon className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
          { label: t('landing.airFreight') || 'Air', value: stats.airSupport, icon: <PlaneIcon className="w-5 h-5" />, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: t('landing.seaFreight') || 'Sea', value: stats.seaSupport, icon: <SeaIcon className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('landing.landFreight') || 'Land', value: stats.landSupport, icon: <TruckIcon className="w-5 h-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
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

      {/* Search */}
      <div className="relative">
        <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('common.search') || 'Search countries...'}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">{editId ? t('common.edit') : t('admin.createCountry')}</h3>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-slate-400 hover:text-slate-600">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={editId ? handleEdit : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.name')} *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('admin.countryCode')} * (ISO 3166-1)</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" maxLength={2} placeholder="e.g. SA, CN, AE" required />
              </div>
              <div className="flex gap-4">
                {[
                  { key: 'supportsAir', label: t('landing.airFreight') || 'Air', icon: <PlaneIcon className="w-4 h-4" /> },
                  { key: 'supportsSea', label: t('landing.seaFreight') || 'Sea', icon: <SeaIcon className="w-4 h-4" /> },
                  { key: 'supportsLand', label: t('landing.landFreight') || 'Land', icon: <TruckIcon className="w-4 h-4" /> },
                ].map(s => (
                  <label key={s.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    form[s.key as keyof typeof form] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'
                  }`}>
                    <input type="checkbox" checked={form[s.key as keyof typeof form] as boolean}
                      onChange={e => setForm({ ...form, [s.key]: e.target.checked })} className="sr-only" />
                    {s.icon}
                    <span className="text-sm text-slate-700">{s.label}</span>
                    {form[s.key as keyof typeof form] && <CheckIcon className="w-3 h-3 text-emerald-600" />}
                  </label>
                ))}
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('common.name')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('admin.countryCode')}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('landing.airFreight')}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('landing.seaFreight')}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('landing.landFreight')}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('common.status')}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">{t('common.loading')}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">{t('admin.noCountries')}</td></tr>
              ) : (
                filtered.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 font-mono">{c.code}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggleSupport(c.id, 'supportsAir', c.supportsAir)}
                        className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${c.supportsAir ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                        {c.supportsAir ? t('common.yes') : t('common.no')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggleSupport(c.id, 'supportsSea', c.supportsSea)}
                        className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${c.supportsSea ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                        {c.supportsSea ? t('common.yes') : t('common.no')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggleSupport(c.id, 'supportsLand', c.supportsLand)}
                        className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${c.supportsLand ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                        {c.supportsLand ? t('common.yes') : t('common.no')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggleActive(c.id, c.active)}
                        className={`px-3 py-1 text-xs rounded-full font-medium ${c.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {c.active ? t('common.active') : t('common.inactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-emerald-600 transition-colors">
                        <EditIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
