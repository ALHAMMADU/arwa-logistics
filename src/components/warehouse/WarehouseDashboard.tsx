'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import {
  PackageIcon, QRIcon, CameraIcon, RefreshIcon,
  ClockIcon, CheckCircleIcon, TruckIcon, BarChartIcon,
} from '@/components/icons';
import { SHIPMENT_STATUS_LABELS, SHIPMENT_STATUS_COLORS, SHIPPING_METHOD_LABELS } from '@/lib/shipping';
import { toast } from 'sonner';
import AutoRefresh from '@/components/shared/AutoRefresh';
import { SkeletonStats, SkeletonTable } from '@/components/shared/SkeletonLoaders';
import { useI18n } from '@/lib/i18n';

// ─── Types ───────────────────────────────────────────────
interface Shipment {
  id: string;
  shipmentId: string;
  trackingNumber: string;
  senderName: string;
  receiverName: string;
  destinationCity: string;
  destinationCountry: string;
  weight: number;
  status: string;
  shippingMethod: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Relative Time Helper (i18n-aware) ──────────────────
function useFormatRelativeTime() {
  const { t } = useI18n();
  return useCallback((dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 1) return t('common.timeAgo.justNow');
    if (diffMinutes < 60) return t('common.timeAgo.minutesAgo').replace('{n}', String(diffMinutes));
    if (diffHours < 24) return t('common.timeAgo.hoursAgo').replace('{n}', String(diffHours));
    const diffDays = Math.floor(diffHours / 24);
    return t('common.timeAgo.daysAgo').replace('{n}', String(diffDays));
  }, [t]);
}

// ─── Stats Card ──────────────────────────────────────────
function StatCard({
  label, value, icon, color, onClick,
}: {
  label: string; value: number; icon: React.ReactNode; color: string; onClick?: () => void;
}) {
  const bgMap: Record<string, string> = {
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/40',
    cyan: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/40',
    teal: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800/40',
  };
  const textMap: Record<string, string> = {
    yellow: 'text-yellow-700 dark:text-yellow-400',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    purple: 'text-purple-700 dark:text-purple-400',
    cyan: 'text-cyan-700 dark:text-cyan-400',
    teal: 'text-teal-700 dark:text-teal-400',
  };
  const labelMap: Record<string, string> = {
    yellow: 'text-yellow-600 dark:text-yellow-500',
    emerald: 'text-emerald-600 dark:text-emerald-500',
    purple: 'text-purple-600 dark:text-purple-500',
    cyan: 'text-cyan-600 dark:text-cyan-500',
    teal: 'text-teal-600 dark:text-teal-500',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-4 border cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ${bgMap[color] || bgMap.yellow}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-2xl font-bold ${textMap[color] || textMap.yellow}`}>{value}</span>
        <span className={textMap[color] || textMap.yellow}>{icon}</span>
      </div>
      <div className={`text-sm font-medium ${labelMap[color] || labelMap.yellow}`}>{label}</div>
    </div>
  );
}

// ─── Main Dashboard Component ────────────────────────────
interface WarehouseDashboardProps {
  initialView?: 'overview' | 'scan' | 'shipments';
}

export default function WarehouseDashboard({ initialView = 'overview' }: WarehouseDashboardProps) {
  const { t } = useI18n();
  const formatRelativeTime = useFormatRelativeTime();

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [scannedId, setScannedId] = useState('');
  const [shipmentDetail, setShipmentDetail] = useState<any>(null);
  const [verifyWeight, setVerifyWeight] = useState('');
  const [verifyLength, setVerifyLength] = useState('');
  const [verifyWidth, setVerifyWidth] = useState('');
  const [verifyHeight, setVerifyHeight] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'processing' | 'all'>('pending');
  const [dashboardView, setDashboardView] = useState<'overview' | 'scan' | 'shipments'>(initialView);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { data: warehouseData } = useFetch<any[]>(() => apiFetch('/warehouses').then(r => r.success ? r.data : []), []);
  const warehouses = warehouseData || [];
  const effectiveWarehouse = selectedWarehouse || (warehouses.length > 0 ? warehouses[0].id : '');

  const { data: shipmentData, loading, refresh: loadShipments } = useFetch<any[]>(() =>
    effectiveWarehouse ? apiFetch(`/warehouses/${effectiveWarehouse}/shipments`).then(r => { if (r.success) { setLastUpdated(new Date()); return r.data; } return []; }) : Promise.resolve([]),
    [effectiveWarehouse]
  );
  const allShipments: Shipment[] = shipmentData || [];

  // ─── Derived Stats ─────────────────────────────────────
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingArrival = allShipments.filter(s => ['CREATED', 'WAITING_WAREHOUSE_ARRIVAL'].includes(s.status)).length;
    const receivedToday = allShipments.filter(s =>
      s.status === 'RECEIVED_AT_WAREHOUSE' && new Date(s.updatedAt) >= today
    ).length;
    const processing = allShipments.filter(s => ['RECEIVED_AT_WAREHOUSE', 'PROCESSING'].includes(s.status)).length;
    const readyForDispatch = allShipments.filter(s => s.status === 'READY_FOR_DISPATCH').length;
    const dispatchedToday = allShipments.filter(s =>
      s.status === 'DISPATCHED' && new Date(s.updatedAt) >= today
    ).length;

    return { pendingArrival, receivedToday, processing, readyForDispatch, dispatchedToday };
  }, [allShipments]);

  const pendingShipments = allShipments.filter(s => ['CREATED', 'WAITING_WAREHOUSE_ARRIVAL'].includes(s.status));
  const processingShipments = allShipments.filter(s => ['RECEIVED_AT_WAREHOUSE', 'PROCESSING', 'READY_FOR_DISPATCH'].includes(s.status));

  // ─── Today's Activity Timeline ─────────────────────────
  const todaysActivity = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activities: { shipmentId: string; action: string; time: string; status: string }[] = [];

    allShipments.forEach(s => {
      const updatedAt = new Date(s.updatedAt);
      if (updatedAt >= today && s.status !== 'CREATED') {
        activities.push({
          shipmentId: s.shipmentId,
          action: SHIPMENT_STATUS_LABELS[s.status] || s.status,
          time: s.updatedAt,
          status: s.status,
        });
      }
    });

    return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
  }, [allShipments]);

  // ─── Incoming Shipments (latest 5 pending) ─────────────
  const incomingShipments = useMemo(() => {
    return pendingShipments.slice(0, 5);
  }, [pendingShipments]);

  // ─── Handlers ──────────────────────────────────────────
  const handleScan = async () => {
    if (!scannedId.trim()) return;
    try {
      let res = await apiFetch(`/tracking/${scannedId.trim()}`);
      if (res.success) { setShipmentDetail(res.data); toast.success(t('warehouse.shipmentFound')); }
      else {
        res = await apiFetch(`/shipments/${scannedId.trim()}`);
        if (res.success) { setShipmentDetail(res.data); toast.success(t('warehouse.shipmentFound')); }
        else { toast.error(t('warehouse.shipmentNotFound')); }
      }
    } catch { toast.error(t('warehouse.scanFailed')); }
  };

  const handleWarehouseAction = async (shipmentId: string, action: 'receive' | 'process' | 'ready' | 'dispatch') => {
    try {
      const res = await apiFetch(`/warehouses/${effectiveWarehouse}/scan`, {
        method: 'POST',
        body: JSON.stringify({ shipmentId, action }),
      });
      if (res.success) {
        toast.success(t('warehouse.actionSuccess').replace('{action}', action));
        loadShipments();
        if (shipmentDetail?.id === shipmentId) setShipmentDetail(res.data);
      } else {
        toast.error(res.error || t('warehouse.actionFailed'));
      }
    } catch { toast.error(t('warehouse.actionFailed')); }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!shipmentDetail || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) { toast.error(t('warehouse.fileSizeLimit')); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error(t('warehouse.imageFormatsOnly')); return; }
    try {
      const res = await apiFetch(`/shipments/${shipmentDetail.id}/photos`, {
        method: 'POST',
        body: JSON.stringify({ photoUrl: URL.createObjectURL(file), description: 'Warehouse photo' }),
      });
      if (res.success) { toast.success(t('warehouse.photoUploaded')); loadShipments(); }
      else { toast.error(res.error || t('warehouse.uploadFailed')); }
    } catch { toast.error(t('warehouse.uploadFailed')); }
  };

  const displayShipments = activeTab === 'pending' ? pendingShipments : activeTab === 'processing' ? processingShipments : allShipments;

  // Tab navigation items
  const tabs = [
    { key: 'overview' as const, label: t('warehouse.overview'), icon: <BarChartIcon className="w-4 h-4" /> },
    { key: 'scan' as const, label: t('warehouse.scanTab'), icon: <QRIcon className="w-4 h-4" /> },
    { key: 'shipments' as const, label: t('warehouse.allShipments'), icon: <PackageIcon className="w-4 h-4" /> },
  ];

  // Loading state
  if (loading && allShipments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('warehouse.dashboard')}</h1>
            <p className="text-slate-500 dark:text-slate-400">{t('warehouse.dashboardDesc')}</p>
          </div>
        </div>
        <SkeletonStats count={5} />
        <div className="grid lg:grid-cols-2 gap-6">
          <SkeletonTable rows={5} columns={4} />
          <SkeletonTable rows={5} columns={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('warehouse.dashboard')}</h1>
          <p className="text-slate-500 dark:text-slate-400">{t('warehouse.dashboardDesc')}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={selectedWarehouse}
            onChange={e => setSelectedWarehouse(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          >
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <AutoRefresh interval={30} onRefresh={loadShipments} lastUpdated={lastUpdated} />
          <button
            onClick={loadShipments}
            className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors hover:shadow-sm"
            aria-label={t('common.refresh')}
          >
            <RefreshIcon className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Dashboard Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setDashboardView(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              dashboardView === tab.key
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow-sm'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </motion.div>

      {/* ─── OVERVIEW TAB ──────────────────────────────── */}
      <AnimatePresence mode="wait">
      {dashboardView === 'overview' && (
        <motion.div
          key="overview"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              label={t('warehouse.pendingArrival')}
              value={stats.pendingArrival}
              icon={<PackageIcon className="w-5 h-5" />}
              color="yellow"
              onClick={() => { setActiveTab('pending'); setDashboardView('shipments'); }}
            />
            <StatCard
              label={t('warehouse.receivedToday')}
              value={stats.receivedToday}
              icon={<CheckCircleIcon className="w-5 h-5" />}
              color="emerald"
            />
            <StatCard
              label={t('warehouse.process') || 'Processing'}
              value={stats.processing}
              icon={<ClockIcon className="w-5 h-5" />}
              color="purple"
              onClick={() => { setActiveTab('processing'); setDashboardView('shipments'); }}
            />
            <StatCard
              label={t('warehouse.readyForDispatch')}
              value={stats.readyForDispatch}
              icon={<TruckIcon className="w-5 h-5" />}
              color="cyan"
            />
            <StatCard
              label={t('warehouse.dispatchedToday')}
              value={stats.dispatchedToday}
              icon={<TruckIcon className="w-5 h-5" />}
              color="teal"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Incoming Shipments Mini-Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden card-interactive">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <PackageIcon className="w-4 h-4 text-yellow-500" />
                  {t('warehouse.incomingShipments')}
                </h3>
                <button
                  onClick={() => { setActiveTab('pending'); setDashboardView('shipments'); }}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
                >
                  {t('warehouse.viewAll')} →
                </button>
              </div>
              {incomingShipments.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <PackageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">{t('warehouse.noIncoming')}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {incomingShipments.map(s => (
                    <div key={s.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100 truncate">{s.shipmentId}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.senderName} → {s.destinationCity}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{s.weight}kg</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${SHIPMENT_STATUS_COLORS[s.status]}`}>
                          {SHIPMENT_STATUS_LABELS[s.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today's Activity Timeline */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden card-interactive">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-purple-500" />
                  {t('warehouse.todaysActivity')}
                </h3>
              </div>
              {todaysActivity.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <ClockIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">{t('warehouse.noActivityToday')}</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto content-scroll">
                  <div className="px-4 py-2">
                    {todaysActivity.map((activity, idx) => (
                      <div key={idx} className="flex gap-3 py-2 stagger-item" style={{ animationDelay: `${idx * 40}ms` }}>
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                            ['RECEIVED_AT_WAREHOUSE', 'DELIVERED'].includes(activity.status) ? 'bg-emerald-500' :
                            ['DISPATCHED', 'IN_TRANSIT'].includes(activity.status) ? 'bg-cyan-500' :
                            ['PROCESSING'].includes(activity.status) ? 'bg-purple-500' :
                            ['READY_FOR_DISPATCH'].includes(activity.status) ? 'bg-indigo-500' :
                            'bg-yellow-500'
                          }`} />
                          {idx < todaysActivity.length - 1 && (
                            <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-1">
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-mono font-medium">{activity.shipmentId}</span>
                            <span className="text-slate-400 dark:text-slate-500"> — {activity.action}</span>
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(activity.time)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Scan Section on Overview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 card-interactive"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <QRIcon className="w-4 h-4 text-emerald-500" />
              {t('warehouse.scanTab')}
            </h3>
            <div className="flex gap-3">
              <input
                value={scannedId}
                onChange={e => setScannedId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                placeholder={t('warehouse.scanPlaceholder')}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              />
              <button
                onClick={handleScan}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-medium text-sm transition-all hover:shadow-md hover:shadow-emerald-600/25 active:scale-[0.98]"
              >
                {t('warehouse.scanButton')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ─── SCAN TAB ─────────────────────────────────── */}
      {dashboardView === 'scan' && (
        <motion.div
          key="scan"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Scan Input */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 card-interactive">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <QRIcon className="w-5 h-5 text-emerald-500" /> {t('warehouse.scanQrSearch')}
            </h3>
            <div className="flex gap-3">
              <input
                value={scannedId}
                onChange={e => setScannedId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                placeholder={t('warehouse.scanPlaceholder')}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              />
              <button onClick={handleScan} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-medium transition-all hover:shadow-md hover:shadow-emerald-600/25 active:scale-[0.98]">
                {t('warehouse.scanButton')}
              </button>
            </div>
          </div>

          {/* Shipment Detail */}
          {shipmentDetail && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{shipmentDetail.shipmentId}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('warehouse.tracking')}: {shipmentDetail.trackingNumber}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{shipmentDetail.senderName} → {shipmentDetail.receiverName}, {shipmentDetail.destinationCity}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('warehouse.weightLabel')}: {shipmentDetail.weight} kg | {SHIPPING_METHOD_LABELS[shipmentDetail.shippingMethod]}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${SHIPMENT_STATUS_COLORS[shipmentDetail.status]}`}>
                  {SHIPMENT_STATUS_LABELS[shipmentDetail.status]}
                </span>
              </div>
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('warehouse.quickActionsLabel')}</p>
                <div className="flex flex-wrap gap-2">
                  {shipmentDetail.status === 'WAITING_WAREHOUSE_ARRIVAL' && <button onClick={() => handleWarehouseAction(shipmentDetail.id, 'receive')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500 transition-all hover:shadow-md active:scale-[0.98]">{t('warehouse.receiveAtWarehouse')}</button>}
                  {shipmentDetail.status === 'RECEIVED_AT_WAREHOUSE' && <button onClick={() => handleWarehouseAction(shipmentDetail.id, 'process')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-500 transition-all hover:shadow-md active:scale-[0.98]">{t('warehouse.startProcessing')}</button>}
                  {shipmentDetail.status === 'PROCESSING' && <button onClick={() => handleWarehouseAction(shipmentDetail.id, 'ready')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-all hover:shadow-md active:scale-[0.98]">{t('warehouse.readyForDispatchAction')}</button>}
                  {shipmentDetail.status === 'READY_FOR_DISPATCH' && <button onClick={() => handleWarehouseAction(shipmentDetail.id, 'dispatch')} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-500 transition-all hover:shadow-md active:scale-[0.98]">{t('warehouse.dispatchAction')}</button>}
                </div>
              </div>
              <div className="mb-4 p-3 bg-white dark:bg-slate-700 rounded-lg">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('warehouse.verifyWeightDimensions')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input value={verifyWeight} onChange={e => setVerifyWeight(e.target.value)} placeholder={`${t('warehouse.weightLabel')}: ${shipmentDetail.weight}kg`} type="number" step="0.1" className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                  <input value={verifyLength} onChange={e => setVerifyLength(e.target.value)} placeholder={t('warehouse.lengthCm')} type="number" className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                  <input value={verifyWidth} onChange={e => setVerifyWidth(e.target.value)} placeholder={t('warehouse.widthCm')} type="number" className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                  <input value={verifyHeight} onChange={e => setVerifyHeight(e.target.value)} placeholder={t('warehouse.heightCm')} type="number" className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                </div>
                <button onClick={() => toast.success(t('warehouse.dimensionsVerified'))} className="mt-2 px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm hover:bg-slate-300 dark:hover:bg-slate-500 transition-all active:scale-[0.98]">{t('warehouse.verify')}</button>
              </div>
              <div className="mb-4 p-3 bg-white dark:bg-slate-700 rounded-lg">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('warehouse.uploadPhoto')}</p>
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm hover:bg-slate-300 dark:hover:bg-slate-500 cursor-pointer w-fit transition-all active:scale-[0.98]">
                  <CameraIcon className="w-4 h-4" /> {t('warehouse.choosePhoto')}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUploadPhoto} className="hidden" />
                </label>
              </div>
              <button onClick={() => setShipmentDetail(null)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">{t('common.close')}</button>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ─── SHIPMENTS TAB ────────────────────────────── */}
      {dashboardView === 'shipments' && (
        <motion.div
          key="shipments"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.25 }}
        >
          {/* Tab Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'pending' ? 'bg-yellow-500 text-white shadow-sm shadow-yellow-500/25' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
              {t('common.pending')} ({pendingShipments.length})
            </button>
            <button onClick={() => setActiveTab('processing')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'processing' ? 'bg-purple-500 text-white shadow-sm shadow-purple-500/25' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
              {t('warehouse.process') || 'Processing'} ({processingShipments.length})
            </button>
            <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
              {t('common.all')} ({allShipments.length})
            </button>
          </div>

          {/* Shipments Table */}
          {loading ? (
            <SkeletonTable rows={6} columns={6} />
          ) : displayShipments.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <PackageIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 dark:text-slate-500">{t('warehouse.noShipmentsCategory')}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden card-interactive">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">ID</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('warehouse.sender')}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('warehouse.destination')}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('common.weight')}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('common.status')}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('warehouse.action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {displayShipments.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-slate-900 dark:text-slate-100">{s.shipmentId}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{s.senderName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{s.destinationCity}, {s.destinationCountry}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{s.weight} kg</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${SHIPMENT_STATUS_COLORS[s.status]}`}>
                            {SHIPMENT_STATUS_LABELS[s.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {s.status === 'WAITING_WAREHOUSE_ARRIVAL' && <button onClick={() => handleWarehouseAction(s.id, 'receive')} className="px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all">{t('warehouse.receive')}</button>}
                            {s.status === 'RECEIVED_AT_WAREHOUSE' && <button onClick={() => handleWarehouseAction(s.id, 'process')} className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all">{t('warehouse.process')}</button>}
                            {s.status === 'PROCESSING' && <button onClick={() => handleWarehouseAction(s.id, 'ready')} className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all">{t('warehouse.readyDispatch')}</button>}
                            {s.status === 'READY_FOR_DISPATCH' && <button onClick={() => handleWarehouseAction(s.id, 'dispatch')} className="px-2 py-1 text-xs bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-all">{t('warehouse.dispatch')}</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
