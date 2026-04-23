'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import {
  MapPinIcon, PlusIcon, XIcon, RefreshIcon,
  WarehouseIcon, EditIcon, BuildingIcon, UsersIcon,
} from '@/components/icons';

export default function AdminWarehouses() {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', city: '', address: '', capacity: '10000', managerId: '' });

  const { data: warehouses, loading, refresh } = useFetch<any[]>(
    () => apiFetch('/warehouses').then(r => r.success ? r.data : []),
    []
  );

  const { data: users } = useFetch<any[]>(
    () => apiFetch('/admin/users').then(r => {
      if (r.success) return r.data?.users || r.data || [];
      return [];
    }),
    []
  );

  const admins = (users || []).filter((u: any) => u.role === 'ADMIN' || u.role === 'WAREHOUSE_STAFF');

  const stats = {
    total: (warehouses || []).length,
    active: (warehouses || []).filter((w: any) => w.active).length,
    totalCapacity: (warehouses || []).reduce((sum: number, w: any) => sum + (w.capacity || 0), 0),
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/warehouses', {
        method: 'POST',
        body: JSON.stringify({ ...form, capacity: parseInt(form.capacity), managerId: form.managerId || undefined }),
      });
      if (res.success) {
        toast.success(t('common.success'));
        setShowForm(false);
        setForm({ name: '', city: '', address: '', capacity: '10000', managerId: '' });
        refresh();
      } else {
        toast.error(res.error || t('common.error'));
      }
    } catch {
      toast.error(t('errors.networkError'));
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    try {
      const res = await apiFetch(`/warehouses/${editId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...form, capacity: parseInt(form.capacity), managerId: form.managerId || undefined }),
      });
      if (res.success) {
        toast.success(t('common.success'));
        setShowForm(false);
        setEditId(null);
        setForm({ name: '', city: '', address: '', capacity: '10000', managerId: '' });
        refresh();
      }
    } catch {
      toast.error(t('errors.networkError'));
    }
  };

  const openEdit = (w: any) => {
    setEditId(w.id);
    setForm({
      name: w.name,
      city: w.city,
      address: w.address,
      capacity: String(w.capacity),
      managerId: w.managerId || '',
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.manageWarehouses')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('admin.manageWarehouses')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshIcon className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', city: '', address: '', capacity: '10000', managerId: '' }); }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" /> {t('admin.createWarehouse')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('common.total') || 'Total', value: stats.total, icon: <WarehouseIcon className="w-5 h-5" />, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: t('common.active') || 'Active', value: stats.active, icon: <CheckIcon className="w-5 h-5 text-green-600" />, color: 'text-green-600', bg: 'bg-green-50' },
          { label: t('warehouse.totalCapacity') || 'Total Capacity', value: `${(stats.totalCapacity / 1000).toFixed(0)}K m3`, icon: <BuildingIcon className="w-5 h-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">{editId ? t('common.edit') : t('admin.createWarehouse')}</h3>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('warehouse.city') || 'City'} *</label>
                  <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('warehouse.capacity') || 'Capacity (m3)'}</label>
                  <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.address')} *</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('warehouse.manager') || 'Manager'}</label>
                <select value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  <option value="">{t('tickets.unassigned') || 'No manager'}</option>
                  {admins.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
                </select>
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

      {/* Warehouse Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">{t('common.loading')}</div>
        ) : (warehouses || []).length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">{t('admin.noWarehouses')}</div>
        ) : (
          (warehouses || []).map((w: any) => (
            <div key={w.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <WarehouseIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{w.name}</h4>
                    <p className="text-sm text-slate-500">{w.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(w)} className="text-slate-400 hover:text-emerald-600">
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${w.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {w.active ? t('common.active') : t('common.inactive')}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-slate-600 flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4 text-slate-400" /> {w.address}
                </p>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('warehouse.capacity') || 'Capacity'}</span>
                  <span className="text-slate-700 font-medium">{w.capacity?.toLocaleString()} m3</span>
                </div>
                {w.manager && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('warehouse.manager') || 'Manager'}</span>
                    <span className="text-slate-700">{w.manager.name}</span>
                  </div>
                )}
                {w._count?.shipments !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('nav.shipments') || 'Shipments'}</span>
                    <span className="text-slate-700 font-medium">{w._count.shipments}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>;
}
