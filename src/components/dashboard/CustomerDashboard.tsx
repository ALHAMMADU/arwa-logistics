'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n/context';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { PackageIcon, PlusIcon, RefreshIcon, MapPinIcon, ClockIcon, PlaneIcon, ShipIcon, TruckIcon, DollarIcon, FileTextIcon, SearchIcon, CheckCircleIcon, TrendingUpIcon, AlertIcon } from '@/components/icons';
import { SHIPMENT_STATUS_LABELS, SHIPMENT_STATUS_COLORS, SHIPPING_METHOD_LABELS } from '@/lib/shipping';
import { SkeletonTable } from '@/components/shared/SkeletonLoaders';
import AutoRefresh from '@/components/shared/AutoRefresh';

// ─── Mini Sparkline for Spending Card ────────────────────
function MiniChart({ data, color = '#10b981', height = 48 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 120;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  });
  const pathD = `M${points.join(' L')}`;
  const areaD = `${pathD} L${w},${height} L0,${height} Z`;

  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
      <defs>
        <linearGradient id="mini-chart-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#mini-chart-grad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Status Bar Component ────────────────────────────────
function StatusBar({ shipments }: { shipments: any[] }) {
  const total = shipments.length;
  if (total === 0) return null;

  const statusCounts: Record<string, number> = {};
  shipments.forEach((s: any) => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });

  const statusOrder = ['IN_TRANSIT', 'DELIVERED', 'PROCESSING', 'CUSTOMS_CLEARANCE', 'DISPATCHED', 'CREATED'];
  const statusColorMap: Record<string, string> = {
    CREATED: 'bg-blue-500',
    WAITING_WAREHOUSE_ARRIVAL: 'bg-yellow-500',
    RECEIVED_AT_WAREHOUSE: 'bg-orange-500',
    PROCESSING: 'bg-purple-500',
    READY_FOR_DISPATCH: 'bg-indigo-500',
    DISPATCHED: 'bg-cyan-500',
    IN_TRANSIT: 'bg-teal-500',
    ARRIVED_AT_DESTINATION: 'bg-emerald-500',
    CUSTOMS_CLEARANCE: 'bg-amber-500',
    OUT_FOR_DELIVERY: 'bg-lime-500',
    DELIVERED: 'bg-green-500',
  };

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
        {statusOrder.map(status => {
          const count = statusCounts[status] || 0;
          if (count === 0) return null;
          return (
            <div
              key={status}
              className={`${statusColorMap[status] || 'bg-slate-400'} transition-all duration-500`}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${SHIPMENT_STATUS_LABELS[status] || status}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {statusOrder.map(status => {
          const count = statusCounts[status] || 0;
          if (count === 0) return null;
          return (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${statusColorMap[status] || 'bg-slate-400'}`} />
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {SHIPMENT_STATUS_LABELS[status] || status} ({count})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const { setCurrentPage, setSelectedShipmentId, user } = useAppStore();
  const { t } = useI18n();
  const [statusFilter, setStatusFilter] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { data: shipmentData, loading, refresh } = useFetch<any>(
    () => apiFetch(`/shipments${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => { if (r.success) { setLastUpdated(new Date()); return r.data; } return null; }),
    [statusFilter]
  );
  const shipments = shipmentData?.shipments || [];

  // Computed stats
  const stats = useMemo(() => {
    const total = shipments.length;
    const inTransit = shipments.filter((s: any) => s.status === 'IN_TRANSIT').length;
    const processing = shipments.filter((s: any) => ['RECEIVED_AT_WAREHOUSE', 'PROCESSING', 'READY_FOR_DISPATCH'].includes(s.status)).length;
    const delivered = shipments.filter((s: any) => s.status === 'DELIVERED').length;
    const totalSpent = shipments.reduce((sum: number, s: any) => sum + (s.shipmentValue || 0), 0);
    const recentShipments = shipments.slice(0, 4);
    return { total, inTransit, processing, delivered, totalSpent, recentShipments };
  }, [shipments]);

  // Spending data for chart (last 6 months)
  const spendingData = useMemo(() => {
    const monthlyTotals: number[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      // Properly handle month subtraction (works across year boundaries)
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();
      const monthTotal = shipments
        .filter((s: any) => {
          const d = new Date(s.createdAt);
          return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        })
        .reduce((sum: number, s: any) => sum + (s.shipmentValue || 0), 0);
      monthlyTotals.push(monthTotal);
    }
    return monthlyTotals;
  }, [shipments]);

  return (
    <div className="space-y-6">
      {/* ── Welcome Back Section ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 sm:p-8 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">{t('dashboard.welcomeBack') || 'Welcome back'}, {user?.name || 'User'}!</h1>
          <p className="text-emerald-100 text-sm">{t('dashboard.overview') || "Here's an overview of your shipping activity."}</p>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: t('common.total'), value: stats.total, icon: <PackageIcon className="w-4 h-4" /> },
              { label: t('status.inTransit') || 'In Transit', value: stats.inTransit, icon: <TruckIcon className="w-4 h-4" /> },
              { label: t('status.processing') || 'Processing', value: stats.processing, icon: <ClockIcon className="w-4 h-4" /> },
              { label: t('status.delivered') || 'Delivered', value: stats.delivered, icon: <CheckCircleIcon className="w-4 h-4" /> },
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  {stat.icon}
                  <span className="text-xs text-emerald-100">{stat.label}</span>
                </div>
                <span className="text-xl font-bold">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">{t('common.quickActions')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: t('shipment.create'), icon: <PlusIcon className="w-5 h-5" />, page: 'create-shipment' as const, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' },
            { label: t('nav.tracking'), icon: <SearchIcon className="w-5 h-5" />, page: 'public-tracking' as const, color: 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/30 border-sky-200 dark:border-sky-800' },
            { label: t('nav.finance'), icon: <FileTextIcon className="w-5 h-5" />, page: 'payment' as const, color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 border-violet-200 dark:border-violet-800' },
          ].map((action, i) => (
            <motion.button
              key={action.label}
              type="button"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentPage(action.page)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-medium text-sm transition-all ${action.color}`}
            >
              {action.icon}
              <span>{action.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── Spending This Month + Status Summary ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Spending Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.spendingOverview') || 'Spending Overview'}</h3>
            </div>
            <span className="text-xs text-slate-400">{t('dashboard.last6Months') || 'Last 6 months'}</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ${stats.totalSpent.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('dashboard.totalShipmentValue') || 'Total shipment value'}</div>
            </div>
            <MiniChart data={spendingData} />
          </div>
        </motion.div>

        {/* Status Summary */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUpIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.statusSummary') || 'Shipment Status Summary'}</h3>
          </div>
          {shipments.length > 0 ? (
            <StatusBar shipments={shipments} />
          ) : (
            <div className="text-center py-4 text-sm text-slate-400">{t('dashboard.noShipmentsDisplay') || 'No shipments to display'}</div>
          )}
        </motion.div>
      </div>

      {/* ── Recent Shipments (Card Layout) ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('common.recent')} Shipments</h3>
          <div className="flex items-center gap-2">
            <AutoRefresh interval={30} onRefresh={refresh} lastUpdated={lastUpdated} />
            <button
              onClick={() => setCurrentPage('create-shipment')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> {t('shipment.create')}
            </button>
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={4} columns={5} />
        ) : shipmentData === null && !loading ? (
          <div className="text-center py-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <AlertIcon className="w-16 h-16 text-red-300 dark:text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">{t('dashboard.failedLoadShipments') || 'Failed to load shipments'}</h3>
            <p className="text-slate-400 dark:text-slate-500 mt-2">{t('common.tryAgainLater') || 'Something went wrong. Please try again.'}</p>
            <button onClick={() => refresh()} className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">
              <span className="flex items-center gap-2"><RefreshIcon className="w-4 h-4" /> {t('common.tryAgain') || 'Try Again'}</span>
            </button>
          </div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <PackageIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">{t('shipment.noShipments')}</h3>
            <p className="text-slate-400 dark:text-slate-500 mt-2">{t('shipment.createFirst')}</p>
            <button onClick={() => setCurrentPage('create-shipment')} className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">
              {t('shipment.create')}
            </button>
          </div>
        ) : (
          <>
            {/* Card Layout for Shipments */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.recentShipments.map((s: any, i: number) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                  whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
                  onClick={() => { setSelectedShipmentId(s.id); setCurrentPage('shipment-detail'); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setSelectedShipmentId(s.id); setCurrentPage('shipment-detail'); } }}
                  role="button"
                  tabIndex={0}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 cursor-pointer transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        s.shippingMethod === 'AIR' ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-500' :
                        s.shippingMethod === 'SEA' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500' :
                        'bg-amber-50 dark:bg-amber-900/20 text-amber-500'
                      }`}>
                        {s.shippingMethod === 'AIR' ? <PlaneIcon className="w-4 h-4" /> :
                         s.shippingMethod === 'SEA' ? <ShipIcon className="w-4 h-4" /> :
                         <TruckIcon className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{s.shipmentId}</div>
                        <div className="text-[10px] text-slate-400">{SHIPPING_METHOD_LABELS[s.shippingMethod] || s.shippingMethod}</div>
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${SHIPMENT_STATUS_COLORS[s.status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                      {SHIPMENT_STATUS_LABELS[s.status] || s.status}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <MapPinIcon className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{s.destinationCity}, {s.destinationCountry}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <PackageIcon className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{s.weight} kg</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <ClockIcon className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {s.shipmentValue && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">${s.shipmentValue.toLocaleString()}</div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Status Filter + Full List */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setStatusFilter('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                {t('common.all')}
              </button>
              {Object.entries(SHIPMENT_STATUS_LABELS).slice(0, 6).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === key ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-3">
              {shipments.map((s: any) => (
                <div key={s.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{s.shipmentId}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{s.trackingNumber}</div>
                    </div>
                    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${SHIPMENT_STATUS_COLORS[s.status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                      {SHIPMENT_STATUS_LABELS[s.status] || s.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <MapPinIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{s.destinationCity}, {s.destinationCountry}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <PackageIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{s.weight} kg</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <ClockIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      {SHIPPING_METHOD_LABELS[s.shippingMethod] || s.shippingMethod}
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedShipmentId(s.id); setCurrentPage('shipment-detail'); }}
                    className="w-full py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors text-center"
                  >
                    {t('common.view')} {t('common.details')}
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('shipment.shipmentId') || 'Shipment ID'}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('shipment.destination') || 'Destination'}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('shipment.method') || 'Method'}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('shipment.weight') || 'Weight'}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('common.status') || 'Status'}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('common.date') || 'Date'}</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {shipments.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{s.shipmentId}</div>
                          <div className="text-xs text-slate-400">{s.trackingNumber}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-700 dark:text-slate-300">{s.destinationCity}</div>
                          <div className="text-xs text-slate-400">{s.destinationCountry}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {s.shippingMethod === 'AIR' ? <PlaneIcon className="w-3.5 h-3.5 text-sky-500" /> :
                             s.shippingMethod === 'SEA' ? <ShipIcon className="w-3.5 h-3.5 text-indigo-500" /> :
                             <TruckIcon className="w-3.5 h-3.5 text-amber-500" />}
                            <span className="text-sm text-slate-600 dark:text-slate-400">{SHIPPING_METHOD_LABELS[s.shippingMethod] || s.shippingMethod}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{s.weight} kg</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${SHIPMENT_STATUS_COLORS[s.status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {SHIPMENT_STATUS_LABELS[s.status] || s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { setSelectedShipmentId(s.id); setCurrentPage('shipment-detail'); }} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 text-sm font-medium">
                            {t('common.view')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
