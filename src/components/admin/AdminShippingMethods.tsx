'use client';
import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { toast } from 'sonner';
import { PlaneIcon, ShipIcon, TruckIcon, PlusIcon, GlobeIcon, RefreshIcon, EditIcon, ToggleIcon } from '@/components/icons';
import { SHIPPING_METHOD_LABELS } from '@/lib/shipping';

interface RouteData {
  id: string;
  name: string;
  originCountry: string;
  destinationCountry: string;
  destinationCity: string | null;
  pricePerKg: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  allowedAir: boolean;
  allowedSea: boolean;
  allowedLand: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = {
  name: '',
  originCountry: 'China',
  destinationCountry: '',
  destinationCity: '',
  pricePerKg: '',
  estimatedDaysMin: '5',
  estimatedDaysMax: '10',
  allowedAir: true,
  allowedSea: true,
  allowedLand: false,
};

export default function AdminShippingMethods() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [viewMode, setViewMode] = useState<'list' | 'comparison'>('list');

  const { data: routes, loading, refresh: loadRoutes } = useFetch<RouteData[]>(
    () => apiFetch('/routes?includeInactive=true').then(r => r.success ? r.data : []),
    []
  );

  // ─── Stats ──────────────────────────────────────────
  const totalRoutes = routes?.length ?? 0;
  const activeRoutes = routes?.filter(r => r.active).length ?? 0;
  const avgPrice = routes?.length
    ? (routes.reduce((sum, r) => sum + r.pricePerKg, 0) / routes.length).toFixed(2)
    : '0.00';
  const cheapest = routes?.length
    ? routes.reduce((min, r) => r.pricePerKg < min.pricePerKg ? r : min, routes[0])
    : null;

  // ─── Create ─────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/routes', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    if (res.success) {
      setShowForm(false);
      setForm({ ...emptyForm });
      loadRoutes();
      toast.success('Route created successfully');
    } else {
      toast.error(res.error || 'Failed to create route');
    }
  };

  // ─── Edit ───────────────────────────────────────────
  const startEdit = (route: RouteData) => {
    setEditingId(route.id);
    setEditForm({
      name: route.name,
      originCountry: route.originCountry,
      destinationCountry: route.destinationCountry,
      destinationCity: route.destinationCity || '',
      pricePerKg: route.pricePerKg,
      estimatedDaysMin: route.estimatedDaysMin,
      estimatedDaysMax: route.estimatedDaysMax,
      allowedAir: route.allowedAir,
      allowedSea: route.allowedSea,
      allowedLand: route.allowedLand,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: string) => {
    const res = await apiFetch(`/routes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(editForm),
    });
    if (res.success) {
      setEditingId(null);
      setEditForm({});
      loadRoutes();
      toast.success('Route updated successfully');
    } else {
      toast.error(res.error || 'Failed to update route');
    }
  };

  // ─── Toggle Active ─────────────────────────────────
  const toggleActive = async (route: RouteData) => {
    const res = await apiFetch(`/routes/${route.id}`, {
      method: 'PUT',
      body: JSON.stringify({ active: !route.active }),
    });
    if (res.success) {
      loadRoutes();
      toast.success(route.active ? 'Route deactivated' : 'Route activated');
    } else {
      toast.error(res.error || 'Failed to toggle route');
    }
  };

  // ─── Toggle method on a route ──────────────────────
  const toggleMethod = async (route: RouteData, method: 'allowedAir' | 'allowedSea' | 'allowedLand') => {
    const res = await apiFetch(`/routes/${route.id}`, {
      method: 'PUT',
      body: JSON.stringify({ [method]: !route[method] }),
    });
    if (res.success) {
      loadRoutes();
      toast.success('Shipping method updated');
    } else {
      toast.error(res.error || 'Failed to update method');
    }
  };

  // ─── Comparison data ───────────────────────────────
  const airRoutes = routes?.filter(r => r.allowedAir && r.active) ?? [];
  const seaRoutes = routes?.filter(r => r.allowedSea && r.active) ?? [];
  const landRoutes = routes?.filter(r => r.allowedLand && r.active) ?? [];

  const methodBadge = (allowed: boolean, label: string, colorActive: string, colorInactive: string) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${allowed ? colorActive : colorInactive}`}>
      {label}
    </span>
  );

  const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipping Methods Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage shipping routes and their method configurations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadRoutes()}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add Route
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <GlobeIcon className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Routes</p>
              <p className="text-xl font-bold text-slate-900">{totalRoutes}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <ToggleIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Active Routes</p>
              <p className="text-xl font-bold text-slate-900">{activeRoutes}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <span className="text-amber-600 font-bold text-sm">$</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Avg Price/Kg</p>
              <p className="text-xl font-bold text-slate-900">${avgPrice}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg">
              <GlobeIcon className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Cheapest Route</p>
              <p className="text-lg font-bold text-slate-900 truncate max-w-[140px]" title={cheapest?.name}>
                {cheapest ? `$${cheapest.pricePerKg}/kg` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <PlusIcon className="w-5 h-5 text-emerald-600" />
            New Shipping Route
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Route Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. China → Saudi Arabia" required />
            </div>
            <div>
              <label className={labelClass}>Origin Country *</label>
              <input value={form.originCountry} onChange={e => setForm({ ...form, originCountry: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Destination Country *</label>
              <input value={form.destinationCountry} onChange={e => setForm({ ...form, destinationCountry: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Destination City</label>
              <input value={form.destinationCity} onChange={e => setForm({ ...form, destinationCity: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Price per Kg (USD) *</label>
              <input type="number" step="0.01" value={form.pricePerKg} onChange={e => setForm({ ...form, pricePerKg: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Min Days</label>
              <input type="number" value={form.estimatedDaysMin} onChange={e => setForm({ ...form, estimatedDaysMin: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Max Days</label>
              <input type="number" value={form.estimatedDaysMax} onChange={e => setForm({ ...form, estimatedDaysMax: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Allowed Shipping Methods</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={form.allowedAir} onChange={e => setForm({ ...form, allowedAir: e.target.checked })} className="rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                <PlaneIcon className="w-4 h-4 text-sky-600" />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">{SHIPPING_METHOD_LABELS.AIR}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={form.allowedSea} onChange={e => setForm({ ...form, allowedSea: e.target.checked })} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <ShipIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">{SHIPPING_METHOD_LABELS.SEA}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={form.allowedLand} onChange={e => setForm({ ...form, allowedLand: e.target.checked })} className="rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                <TruckIcon className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">{SHIPPING_METHOD_LABELS.LAND}</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors">Create Route</button>
            <button type="button" onClick={() => { setShowForm(false); setForm({ ...emptyForm }); }} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* View Toggle */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Route List
        </button>
        <button
          onClick={() => setViewMode('comparison')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'comparison' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Price Comparison
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading routes...</div>
      ) : viewMode === 'list' ? (
        /* ─── Route List ──────────────────────────────── */
        <div className="space-y-4">
          {routes && routes.length > 0 ? routes.map(route => (
            <div
              key={route.id}
              className={`bg-white rounded-xl border p-5 transition-all ${route.active ? 'border-slate-200 hover:shadow-md' : 'border-slate-200 opacity-60'}`}
            >
              {editingId === route.id ? (
                /* ─── Inline Edit Mode ─────────────────── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <EditIcon className="w-4 h-4 text-emerald-600" />
                      Editing Route
                    </h4>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(route.id)} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors">Save</button>
                      <button onClick={cancelEdit} className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-colors">Cancel</button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className={labelClass}>Route Name</label>
                      <input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Origin Country</label>
                      <input value={editForm.originCountry || ''} onChange={e => setEditForm({ ...editForm, originCountry: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Destination Country</label>
                      <input value={editForm.destinationCountry || ''} onChange={e => setEditForm({ ...editForm, destinationCountry: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Destination City</label>
                      <input value={editForm.destinationCity || ''} onChange={e => setEditForm({ ...editForm, destinationCity: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Price per Kg (USD)</label>
                      <input type="number" step="0.01" value={editForm.pricePerKg ?? ''} onChange={e => setEditForm({ ...editForm, pricePerKg: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Min Days</label>
                      <input type="number" value={editForm.estimatedDaysMin ?? ''} onChange={e => setEditForm({ ...editForm, estimatedDaysMin: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Max Days</label>
                      <input type="number" value={editForm.estimatedDaysMax ?? ''} onChange={e => setEditForm({ ...editForm, estimatedDaysMax: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Allowed Shipping Methods</p>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editForm.allowedAir ?? false} onChange={e => setEditForm({ ...editForm, allowedAir: e.target.checked })} className="rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                        <PlaneIcon className="w-4 h-4 text-sky-600" />
                        <span className="text-sm text-slate-700">{SHIPPING_METHOD_LABELS.AIR}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editForm.allowedSea ?? false} onChange={e => setEditForm({ ...editForm, allowedSea: e.target.checked })} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <ShipIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-slate-700">{SHIPPING_METHOD_LABELS.SEA}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editForm.allowedLand ?? false} onChange={e => setEditForm({ ...editForm, allowedLand: e.target.checked })} className="rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                        <TruckIcon className="w-4 h-4 text-amber-600" />
                        <span className="text-sm text-slate-700">{SHIPPING_METHOD_LABELS.LAND}</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                /* ─── View Mode ────────────────────────── */
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-slate-900">{route.name}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${route.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {route.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(route)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit">
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleActive(route)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title={route.active ? 'Deactivate' : 'Activate'}>
                        <ToggleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-slate-500">Origin</span>
                      <p className="font-medium text-slate-900">{route.originCountry}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Destination</span>
                      <p className="font-medium text-slate-900">{route.destinationCountry}{route.destinationCity ? `, ${route.destinationCity}` : ''}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Price/kg</span>
                      <p className="font-semibold text-emerald-600">${route.pricePerKg}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Delivery</span>
                      <p className="font-medium text-slate-900">{route.estimatedDaysMin}–{route.estimatedDaysMax} days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 mr-1">Methods:</span>
                    <button onClick={() => toggleMethod(route, 'allowedAir')} className="cursor-pointer">
                      {methodBadge(route.allowedAir, SHIPPING_METHOD_LABELS.AIR, 'bg-sky-50 text-sky-700', 'bg-slate-100 text-slate-400 line-through')}
                    </button>
                    <button onClick={() => toggleMethod(route, 'allowedSea')} className="cursor-pointer">
                      {methodBadge(route.allowedSea, SHIPPING_METHOD_LABELS.SEA, 'bg-blue-50 text-blue-700', 'bg-slate-100 text-slate-400 line-through')}
                    </button>
                    <button onClick={() => toggleMethod(route, 'allowedLand')} className="cursor-pointer">
                      {methodBadge(route.allowedLand, SHIPPING_METHOD_LABELS.LAND, 'bg-amber-50 text-amber-700', 'bg-slate-100 text-slate-400 line-through')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )) : (
            <div className="text-center py-12 text-slate-400">No shipping routes found. Create one to get started.</div>
          )}
        </div>
      ) : (
        /* ─── Price Comparison Table ──────────────────── */
        <div className="space-y-6">
          {/* Air */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-sky-50 border-b border-sky-100 flex items-center gap-2">
              <PlaneIcon className="w-5 h-5 text-sky-600" />
              <h3 className="font-semibold text-sky-900">{SHIPPING_METHOD_LABELS.AIR}</h3>
              <span className="text-xs text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">{airRoutes.length} routes</span>
            </div>
            {airRoutes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Route</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Origin</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Destination</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Price/Kg</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {airRoutes.sort((a, b) => a.pricePerKg - b.pricePerKg).map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{r.originCountry}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{r.destinationCountry}{r.destinationCity ? `, ${r.destinationCity}` : ''}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">${r.pricePerKg}</td>
                        <td className="px-4 py-3 text-sm text-center text-slate-700">{r.estimatedDaysMin}–{r.estimatedDaysMax}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-6 text-center text-sm text-slate-400">No air freight routes available</div>
            )}
          </div>

          {/* Sea */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
              <ShipIcon className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">{SHIPPING_METHOD_LABELS.SEA}</h3>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{seaRoutes.length} routes</span>
            </div>
            {seaRoutes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Route</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Origin</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Destination</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Price/Kg</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {seaRoutes.sort((a, b) => a.pricePerKg - b.pricePerKg).map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{r.originCountry}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{r.destinationCountry}{r.destinationCity ? `, ${r.destinationCity}` : ''}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">${r.pricePerKg}</td>
                        <td className="px-4 py-3 text-sm text-center text-slate-700">{r.estimatedDaysMin}–{r.estimatedDaysMax}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-6 text-center text-sm text-slate-400">No sea freight routes available</div>
            )}
          </div>

          {/* Land */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900">{SHIPPING_METHOD_LABELS.LAND}</h3>
              <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{landRoutes.length} routes</span>
            </div>
            {landRoutes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Route</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Origin</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Destination</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Price/Kg</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {landRoutes.sort((a, b) => a.pricePerKg - b.pricePerKg).map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{r.originCountry}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{r.destinationCountry}{r.destinationCity ? `, ${r.destinationCity}` : ''}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">${r.pricePerKg}</td>
                        <td className="px-4 py-3 text-sm text-center text-slate-700">{r.estimatedDaysMin}–{r.estimatedDaysMax}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-6 text-center text-sm text-slate-400">No land freight routes available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
