'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import {
  ShipIcon, SearchIcon, ArrowLeftIcon, MapPinIcon, PlaneIcon,
  TruckIcon, QRIcon, ShareIcon, DownloadIcon, CheckCircleIcon,
  ClockIcon, PackageIcon, RefreshIcon, CopyIcon,
} from '@/components/icons';
import {
  SHIPMENT_STATUS_LABELS, SHIPMENT_STATUS_COLORS,
  SHIPPING_METHOD_LABELS, SHIPMENT_TYPE_LABELS,
} from '@/lib/shipping';
import { STATUS_FLOW, getStatusProgress, getStatusIndex } from '@/lib/status-flow';
import { SkeletonCard, SkeletonTimeline } from '@/components/shared/SkeletonLoaders';

// ─── Status Icon Mapping ──────────────────────────────────
function StatusIcon({ status, className = 'w-5 h-5' }: { status: string; className?: string }) {
  const idx = getStatusIndex(status);
  if (status === 'DELIVERED') return <CheckCircleIcon className={`${className} text-emerald-500`} />;
  if (status === 'IN_TRANSIT' || status === 'DISPATCHED') return <PlaneIcon className={`${className} text-cyan-500`} />;
  if (status === 'OUT_FOR_DELIVERY') return <TruckIcon className={`${className} text-lime-500`} />;
  if (status === 'CUSTOMS_CLEARANCE') return <PackageIcon className={`${className} text-amber-500`} />;
  if (idx >= 5) return <TruckIcon className={`${className} text-teal-500`} />;
  return <ClockIcon className={`${className} text-yellow-500`} />;
}

// ─── Hero Particles ───────────────────────────────────────
function HeroParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${20 + Math.random() * 70}%`,
      delay: `${Math.random() * 6}s`,
      duration: `${4 + Math.random() * 4}s`,
      size: `${2 + Math.random() * 4}px`,
    })), []
  );

  return (
    <div className="hero-particles">
      {particles.map(p => (
        <div
          key={p.id}
          className="hero-particle"
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
}

// ─── SVG Route Visualization ──────────────────────────────
function RouteVisualization({
  origin,
  destination,
  progress,
  shippingMethod,
  isRTL,
}: {
  origin: string;
  destination: string;
  progress: number;
  shippingMethod: string;
  isRTL: boolean;
}) {
  const TransportIcon = shippingMethod === 'AIR' ? PlaneIcon : shippingMethod === 'SEA' ? ShipIcon : TruckIcon;

  // Position on the route line (0 to 1)
  const position = Math.min(progress / 100, 1);
  const markerX = isRTL ? 340 - position * 300 : 40 + position * 300;

  return (
    <div className="w-full px-2">
      <svg viewBox="0 0 380 80" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Background route line */}
        <line
          x1={isRTL ? 340 : 40} y1="40" x2={isRTL ? 40 : 340} y2="40"
          stroke="rgba(255,255,255,0.1)" strokeWidth="3" strokeLinecap="round"
        />

        {/* Progress route line */}
        <line
          x1={isRTL ? 340 : 40} y1="40" x2={markerX} y2="40"
          stroke="url(#routeGradient)" strokeWidth="3" strokeLinecap="round"
          className="animate-route-draw"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Origin dot */}
        <circle cx={isRTL ? 340 : 40} cy="40" r="6" fill="#ef4444" />
        <circle cx={isRTL ? 340 : 40} cy="40" r="3" fill="white" />

        {/* Destination dot */}
        <circle cx={isRTL ? 40 : 340} cy="40" r="6" fill="#10b981" />
        <circle cx={isRTL ? 40 : 340} cy="40" r="3" fill="white" />

        {/* Waypoint dots */}
        {[0.33, 0.66].map((frac, i) => {
          const wx = isRTL ? 340 - frac * 300 : 40 + frac * 300;
          const passed = position >= frac;
          return (
            <circle key={i} cx={wx} cy="40" r="4" fill={passed ? '#10b981' : 'rgba(255,255,255,0.2)'} />
          );
        })}

        {/* Current position marker with pulse */}
        <circle cx={markerX} cy="40" r="8" fill="#10b981" opacity="0.3" className="animate-pulse-dot" />
        <circle cx={markerX} cy="40" r="5" fill="#10b981" filter="url(#glow)" />

        {/* Transport icon position */}
        <g transform={`translate(${markerX - 10}, 12)`}>
          <TransportIcon className="w-5 h-5 text-emerald-400" />
        </g>

        {/* Labels */}
        <text x={isRTL ? 340 : 40} y="65" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10" fontWeight="500">
          {origin}
        </text>
        <text x={isRTL ? 40 : 340} y="65" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10" fontWeight="500">
          {destination}
        </text>
      </svg>
    </div>
  );
}

// ─── Enhanced Timeline ────────────────────────────────────
function EnhancedTimeline({
  events,
  currentStatusIdx,
}: {
  events: any[];
  currentStatusIdx: number;
}) {
  // Build timeline items: actual events in reverse order (newest first), then remaining future steps
  const timelineItems = useMemo(() => {
    const items: any[] = [];
    const actualStatuses = events.map(e => e.status);

    // Add actual tracking events (they come newest first from API)
    events.forEach((event: any, i: number) => {
      const flowIdx = getStatusIndex(event.status);
      items.push({
        type: 'actual' as const,
        status: event.status,
        location: event.location,
        timestamp: event.timestamp,
        notes: event.notes,
        isCurrent: i === 0,
        flowIdx,
      });
    });

    // Add future steps (greyed out)
    if (currentStatusIdx < STATUS_FLOW.length - 1) {
      for (let i = currentStatusIdx + 1; i < STATUS_FLOW.length; i++) {
        if (!actualStatuses.includes(STATUS_FLOW[i])) {
          items.push({
            type: 'future' as const,
            status: STATUS_FLOW[i],
            location: '',
            timestamp: null,
            notes: null,
            isCurrent: false,
            flowIdx: i,
          });
        }
      }
    }

    return items;
  }, [events, currentStatusIdx]);

  return (
    <div className="max-h-96 overflow-y-auto tracking-scroll pr-2">
      <div className="relative">
        {timelineItems.map((item, i) => {
          const isLast = i === timelineItems.length - 1;
          const isActual = item.type === 'actual';
          const isCurrent = item.isCurrent;

          return (
            <motion.div
              key={`${item.status}-${i}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="flex gap-4 relative"
            >
              {/* Vertical connector line */}
              <div className="flex flex-col items-center shrink-0">
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  isCurrent
                    ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/30'
                    : isActual
                      ? 'bg-emerald-500/20 border-emerald-500/50'
                      : 'bg-white/5 border-white/10'
                }`}>
                  {isCurrent ? (
                    <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400/30" />
                  ) : null}
                  <StatusIcon
                    status={item.status}
                    className={isCurrent ? 'w-5 h-5 text-white' : isActual ? 'w-4 h-4 text-emerald-400' : 'w-4 h-4 text-white/30'}
                  />
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-[2rem] ${
                    isActual && timelineItems[i + 1]?.type === 'actual'
                      ? 'bg-emerald-500/40'
                      : isActual
                        ? 'bg-gradient-to-b from-emerald-500/40 to-white/10'
                        : 'bg-white/10'
                  }`} />
                )}
              </div>

              {/* Content */}
              <div className={`pb-6 flex-1 ${!isActual ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <p className={`text-sm font-semibold ${
                    isCurrent ? 'text-emerald-400' : isActual ? 'text-white/90' : 'text-white/50'
                  }`}>
                    {SHIPMENT_STATUS_LABELS[item.status] || item.status}
                  </p>
                  {isCurrent && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      CURRENT
                    </span>
                  )}
                </div>
                {item.location && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPinIcon className="w-3.5 h-3.5 text-white/40" />
                    <p className="text-xs text-white/50">{item.location}</p>
                  </div>
                )}
                {item.timestamp && (
                  <p className="text-xs text-white/40">
                    {new Date(item.timestamp).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs text-white/40 mt-1 italic">{item.notes}</p>
                )}
                {!isActual && (
                  <p className="text-[10px] text-white/20 mt-1">Pending</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Not Found Illustration ───────────────────────────────
function NotFoundIllustration() {
  return (
    <svg viewBox="0 0 200 160" className="w-48 h-auto mx-auto mb-6" fill="none">
      {/* Magnifying glass */}
      <circle cx="85" cy="65" r="35" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
      <line x1="110" y1="90" x2="140" y2="120" stroke="rgba(255,255,255,0.2)" strokeWidth="4" strokeLinecap="round" />
      {/* Question mark */}
      <text x="78" y="78" fill="rgba(16,185,129,0.5)" fontSize="32" fontWeight="bold" fontFamily="sans-serif">?</text>
      {/* Decorative dots */}
      <circle cx="30" cy="40" r="3" fill="rgba(16,185,129,0.3)" />
      <circle cx="160" cy="30" r="2" fill="rgba(16,185,129,0.2)" />
      <circle cx="170" cy="80" r="4" fill="rgba(16,185,129,0.15)" />
      <circle cx="20" cy="100" r="2" fill="rgba(16,185,129,0.25)" />
    </svg>
  );
}

// ─── Copy Icon (small inline) ─────────────────────────────
function CopyIconSmall({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────
export default function PublicTrackingPage() {
  const { setCurrentPage } = useAppStore();
  const { t, dir, isRTL } = useI18n();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleTrack = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trackingNumber.trim()) return;
    setLoading(true);
    setError('');
    setShipment(null);
    try {
      const res = await apiFetch(`/tracking/${trackingNumber.trim()}`);
      if (res.success) setShipment(res.data);
      else setError(t('tracking.notFound'));
    } catch {
      setError(t('errors.networkError'));
    }
    setLoading(false);
  }, [trackingNumber, t]);

  const progress = shipment ? getStatusProgress(shipment.status) : 0;
  const currentStatusIdx = shipment ? STATUS_FLOW.indexOf(shipment.status as any) : -1;

  const qrUrl = shipment
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
        (typeof window !== 'undefined' ? window.location.origin : '') + '/track/' + shipment.trackingNumber
      )}`
    : '';

  const trackingShareUrl = shipment
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/track/${shipment.trackingNumber}`
    : '';

  const handleCopyLink = useCallback(() => {
    if (typeof navigator !== 'undefined' && trackingShareUrl) {
      navigator.clipboard.writeText(trackingShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [trackingShareUrl]);

  const handleDownloadReceipt = useCallback(() => {
    if (!shipment) return;
    const receiptText = [
      `ARWA LOGISTICS - Tracking Receipt`,
      `================================`,
      `Shipment ID: ${shipment.shipmentId}`,
      `Tracking Number: ${shipment.trackingNumber}`,
      `Status: ${SHIPMENT_STATUS_LABELS[shipment.status] || shipment.status}`,
      `Destination: ${shipment.destinationCity}, ${shipment.destinationCountry}`,
      `Shipping Method: ${SHIPPING_METHOD_LABELS[shipment.shippingMethod] || shipment.shippingMethod}`,
      `Shipment Type: ${SHIPMENT_TYPE_LABELS[shipment.shipmentType] || shipment.shipmentType}`,
      shipment.estimatedDelivery ? `Estimated Delivery: ${new Date(shipment.estimatedDelivery).toLocaleDateString()}` : '',
      `Created: ${new Date(shipment.createdAt).toLocaleDateString()}`,
      ``,
      `Tracking Events:`,
      ...(shipment.trackingEvents || []).map((e: any, i: number) =>
        `  ${i + 1}. ${SHIPMENT_STATUS_LABELS[e.status] || e.status} - ${e.location || 'N/A'} (${new Date(e.timestamp).toLocaleString()})`
      ),
    ].filter(Boolean).join('\n');

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tracking-receipt-${shipment.trackingNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [shipment]);

  // Demo tracking numbers for quick buttons
  const demoTrackingNumbers = ['ARW-TRACK-DEMO1', 'ARW-TRACK-DEMO2', 'ARW-TRACK-DEMO3'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 relative" dir={dir}>
      {/* ── Navigation ── */}
      <nav className="border-b border-white/10 backdrop-blur-md bg-black/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage('landing')}
            className="flex items-center gap-3 group"
          >
            <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
              <ShipIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white text-sm tracking-wide">ARWA LOGISTICS</span>
          </button>
          <button
            onClick={() => setCurrentPage('login')}
            className="px-5 py-2.5 text-sm text-white/80 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all"
          >
            {t('auth.loginButton')}
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden">
        <HeroParticles />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="animate-float inline-block mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm">
                <ShipIcon className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
              {t('tracking.title')}
            </h1>
            <p className="text-slate-400 text-base sm:text-lg mb-8 max-w-lg mx-auto">
              {t('tracking.subtitle')}
            </p>
          </motion.div>

          {/* Search form */}
          <motion.form
            onSubmit={handleTrack}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-sm mb-6 shadow-2xl shadow-black/20"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative group">
                <SearchIcon className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-400 transition-colors ${loading ? 'animate-spin-slow' : ''}`} />
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  placeholder={t('tracking.placeholder')}
                  className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-base`}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-2 min-h-[48px]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('tracking.searching')}</span>
                  </>
                ) : (
                  <>
                    <SearchIcon className="w-5 h-5" />
                    <span>{t('tracking.trackButton')}</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>

          {/* Quick track demo buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-2"
          >
            <span className="text-xs text-white/30 mr-1">Try:</span>
            {demoTrackingNumbers.map(num => (
              <button
                key={num}
                onClick={() => { setTrackingNumber(num); }}
                className="px-3 py-1.5 text-xs text-emerald-400/70 bg-emerald-500/5 border border-emerald-500/10 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-400 transition-all font-mono"
              >
                {num}
              </button>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <AnimatePresence mode="wait">
          {/* Error - Not Found */}
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-8"
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 sm:p-10 backdrop-blur-sm text-center">
                <NotFoundIllustration />
                <h3 className="text-xl font-bold text-white/90 mb-2">Shipment Not Found</h3>
                <p className="text-white/50 text-sm mb-6">{error}</p>

                <button
                  onClick={() => { setTrackingNumber(''); setError(''); }}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 transition-all inline-flex items-center gap-2 mb-6"
                >
                  <RefreshIcon className="w-4 h-4" />
                  Try Again
                </button>

                <div className="border-t border-white/10 pt-6">
                  <p className="text-xs text-white/30 mb-3">Suggested tracking number formats:</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {['ARW-TRACK-XXXXXX', 'ARW-2026-XXXXXX'].map(fmt => (
                      <span key={fmt} className="px-3 py-1.5 text-xs font-mono text-white/40 bg-white/5 rounded-lg border border-white/5">
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8 space-y-6"
            >
              <SkeletonCard rows={3} showAvatar showFooter />
              <div className="grid sm:grid-cols-2 gap-6">
                <SkeletonCard rows={3} />
                <SkeletonCard rows={3} />
              </div>
              <SkeletonTimeline events={3} />
            </motion.div>
          )}

          {/* Shipment Found */}
          {shipment && !loading && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 space-y-6"
            >
              {/* ── Status Hero Card ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-br from-emerald-900/40 via-slate-800/80 to-slate-900/80 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden"
              >
                {/* Decorative background glow */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-emerald-500/3 rounded-full blur-3xl" />

                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <StatusIcon status={shipment.status} className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h2 className="text-xl sm:text-2xl font-bold text-white">{shipment.shipmentId}</h2>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${SHIPMENT_STATUS_COLORS[shipment.status]}`}>
                            {SHIPMENT_STATUS_LABELS[shipment.status]}
                          </span>
                        </div>
                        <p className="text-white/50 text-sm">
                          {t('tracking.trackingLabel')}: <span className="font-mono text-emerald-400">{shipment.trackingNumber}</span>
                        </p>
                      </div>
                    </div>
                    {qrUrl && (
                      <div className="bg-white rounded-xl p-2 shrink-0">
                        <img src={qrUrl} alt="QR Code" className="w-20 h-20 rounded-lg" />
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-white/40 mb-2">
                      <span>{t('tracking.progress')}</span>
                      <span className="font-semibold text-emerald-400">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full relative"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Mini status flow dots */}
                  <div className="mt-4 overflow-x-auto pb-1">
                    <div className="flex gap-0.5 min-w-max justify-between">
                      {STATUS_FLOW.map((status, i) => {
                        const isCompleted = i < currentStatusIdx;
                        const isCurrent = i === currentStatusIdx;
                        return (
                          <div key={status} className="flex flex-col items-center" style={{ minWidth: '62px' }}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                              isCompleted ? 'bg-emerald-500 text-white' :
                              isCurrent ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-slate-900' :
                              'bg-white/10 text-white/30'
                            }`}>
                              {isCompleted ? '✓' : i + 1}
                            </div>
                            <span className={`text-[8px] mt-1 text-center leading-tight ${
                              isCompleted || isCurrent ? 'text-emerald-400 font-medium' : 'text-white/20'
                            }`}>
                              {SHIPMENT_STATUS_LABELS[status].split(' ').slice(0, 2).join(' ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ── SVG Route Visualization ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
              >
                <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4 text-emerald-400" />
                  {t('shipment.route')}
                </h3>
                <RouteVisualization
                  origin="China"
                  destination={`${shipment.destinationCity}, ${shipment.destinationCountry}`}
                  progress={progress}
                  shippingMethod={shipment.shippingMethod}
                  isRTL={isRTL}
                />
              </motion.div>

              {/* ── Details Grid ── */}
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Route Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      {shipment.shippingMethod === 'AIR' ? (
                        <PlaneIcon className="w-4 h-4 text-emerald-400" />
                      ) : shipment.shippingMethod === 'SEA' ? (
                        <ShipIcon className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <TruckIcon className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white/70">{t('shipment.route')}</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-500/20 shrink-0" />
                      <div>
                        <p className="text-xs text-white/40">Origin</p>
                        <p className="text-sm text-white font-medium">China</p>
                      </div>
                    </div>
                    <div className={`w-0.5 h-6 ${isRTL ? 'mr-1.5' : 'ml-1.5'} border-l-2 border-dashed border-emerald-500/30`} />
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0" />
                      <div>
                        <p className="text-xs text-white/40">Destination</p>
                        <p className="text-sm text-white font-medium">{shipment.destinationCity}, {shipment.destinationCountry}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Shipping Method Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <PackageIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white/70">{t('tracking.shipmentInfo')}</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/40">{t('shipment.method')}</span>
                      <span className="text-white/90 font-medium">{SHIPPING_METHOD_LABELS[shipment.shippingMethod]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">{t('shipment.type')}</span>
                      <span className="text-white/90 font-medium">{SHIPMENT_TYPE_LABELS[shipment.shipmentType]}</span>
                    </div>
                    {shipment.estimatedDelivery && (
                      <div className="flex justify-between">
                        <span className="text-white/40">Est. Delivery</span>
                        <span className="text-emerald-400 font-medium">
                          {new Date(shipment.estimatedDelivery).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Weight & Dimensions Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <PackageIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white/70">{t('common.weight')} & {t('common.dimensions')}</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/40">{t('common.weight')}</span>
                      <span className="text-white/90 font-medium">{shipment.weight} kg</span>
                    </div>
                    {(shipment.length || shipment.width || shipment.height) && (
                      <div className="flex justify-between">
                        <span className="text-white/40">{t('common.dimensions')}</span>
                        <span className="text-white/90 font-medium">
                          {shipment.length}×{shipment.width}×{shipment.height} cm
                        </span>
                      </div>
                    )}
                    {shipment.productDescription && (
                      <div>
                        <span className="text-white/40 text-xs">{t('common.description')}</span>
                        <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{shipment.productDescription}</p>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Cost / Payment Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <QRIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white/70">Shipment Details</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    {shipment.shipmentValue != null && (
                      <div className="flex justify-between">
                        <span className="text-white/40">Declared Value</span>
                        <span className="text-white/90 font-medium">${shipment.shipmentValue.toLocaleString()} USD</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-white/40">Created</span>
                      <span className="text-white/90 font-medium">
                        {new Date(shipment.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </span>
                    </div>
                    {shipment.actualDelivery && (
                      <div className="flex justify-between">
                        <span className="text-white/40">Delivered</span>
                        <span className="text-emerald-400 font-medium">
                          {new Date(shipment.actualDelivery).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* ── Enhanced Timeline ── */}
              {(shipment.trackingEvents || []).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.35 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-emerald-400" />
                      {t('tracking.timeline')}
                    </h3>
                    <span className="text-xs text-white/30">
                      {(shipment.trackingEvents || []).length} events
                    </span>
                  </div>
                  <EnhancedTimeline
                    events={shipment.trackingEvents || []}
                    currentStatusIdx={currentStatusIdx}
                  />
                </motion.div>
              )}

              {/* ── QR Code & Share Section ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
              >
                <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
                  <ShareIcon className="w-4 h-4 text-emerald-400" />
                  Share & Download
                </h3>
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  {qrUrl && (
                    <div className="bg-white rounded-xl p-3 shrink-0">
                      <img src={qrUrl} alt="QR Code for tracking" className="w-28 h-28 rounded-lg" />
                    </div>
                  )}
                  <div className="flex-1 space-y-3 w-full sm:w-auto">
                    <button
                      onClick={handleCopyLink}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 rounded-xl font-medium hover:bg-emerald-600/30 transition-all text-sm"
                    >
                      {copied ? (
                        <>
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <CopyIconSmall />
                          <span>Share Tracking Link</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadReceipt}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white/5 border border-white/10 text-white/70 rounded-xl font-medium hover:bg-white/10 hover:text-white transition-all text-sm"
                    >
                      <DownloadIcon className="w-4 h-4" />
                      <span>Download Tracking Receipt</span>
                    </button>
                    <p className="text-[10px] text-white/20 text-center">
                      Scan QR code or share the link to track this shipment
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Back to Home ── */}
        <div className="mt-10 text-center">
          <button
            onClick={() => setCurrentPage('landing')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {t('auth.backToHome')}
          </button>
        </div>
      </div>
    </div>
  );
}
