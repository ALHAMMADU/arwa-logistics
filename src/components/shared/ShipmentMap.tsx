'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import {
  MapPinIcon, PlaneIcon, ShipIcon, TruckIcon, RefreshIcon, PackageIcon,
  MapIcon,
} from '@/components/icons';

// ─── Types ───────────────────────────────────────────────

interface MapShipment {
  id: string;
  shipmentId: string;
  trackingNumber: string;
  status: string;
  destinationCountry: string;
  destinationCity: string;
  shippingMethod: string;
  originCountry: string;
  currentLocation: { lat: number; lng: number; label: string };
  coordinates: { lat: number; lng: number };
  originCoordinates: { lat: number; lng: number };
  hasCompletedPayment: boolean;
}

interface MapStats {
  active: number;
  inTransit: number;
  dispatched: number;
  arrived: number;
}

// ─── Status Colors ──────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DISPATCHED: '#3b82f6',
  IN_TRANSIT: '#f59e0b',
  ARRIVED_AT_DESTINATION: '#8b5cf6',
  CUSTOMS_CLEARANCE: '#ec4899',
  OUT_FOR_DELIVERY: '#06b6d4',
};

const STATUS_LABELS: Record<string, string> = {
  DISPATCHED: 'Dispatched',
  IN_TRANSIT: 'In Transit',
  ARRIVED_AT_DESTINATION: 'Arrived',
  CUSTOMS_CLEARANCE: 'Customs',
  OUT_FOR_DELIVERY: 'Out for Delivery',
};

// ─── Mercator Projection ───────────────────────────────

function latLngToXY(lat: number, lng: number, width: number, height: number) {
  const x = ((lng + 180) / 360) * width;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = height / 2 - (mercN / Math.PI) * (height / 2);
  return { x, y };
}

// ─── Component ──────────────────────────────────────────

export default function ShipmentMap() {
  const { setSelectedShipmentId, setCurrentPage } = useAppStore();
  const [shipments, setShipments] = useState<MapShipment[]>([]);
  const [stats, setStats] = useState<MapStats>({ active: 0, inTransit: 0, dispatched: 0, arrived: 0 });
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredShipment, setHoveredShipment] = useState<MapShipment | null>(null);

  const loadData = useCallback(async () => {
    try {
      const params = methodFilter ? `?method=${methodFilter}` : '';
      const res = await apiFetch(`/shipments/map${params}`);
      if (res.success && res.data) {
        setShipments(res.data.shipments || []);
        setStats(res.data.stats || { active: 0, inTransit: 0, dispatched: 0, arrived: 0 });
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [methodFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkerHover = (shipment: MapShipment, event: React.MouseEvent) => {
    setHoveredId(shipment.id);
    setHoveredShipment(shipment);
    const rect = (event.currentTarget as SVGElement).closest('svg')?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    }
  };

  const handleMarkerLeave = () => {
    setHoveredId(null);
    setHoveredShipment(null);
    setTooltipPos(null);
  };

  const handleShipmentClick = (shipment: MapShipment) => {
    setSelectedShipmentId(shipment.id);
    setCurrentPage('shipment-detail');
  };

  // SVG dimensions
  const svgWidth = 900;
  const svgHeight = 500;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <MapIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Shipment Map
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time visualization of active shipments worldwide
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Method Filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
            {[
              { key: '', label: 'All', icon: <PackageIcon className="w-3.5 h-3.5" /> },
              { key: 'AIR', label: 'Air', icon: <PlaneIcon className="w-3.5 h-3.5" /> },
              { key: 'SEA', label: 'Sea', icon: <ShipIcon className="w-3.5 h-3.5" /> },
              { key: 'LAND', label: 'Land', icon: <TruckIcon className="w-3.5 h-3.5" /> },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setMethodFilter(f.key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  methodFilter === f.key
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {f.icon}
                <span className="hidden sm:inline">{f.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active', value: stats.active, colorClass: 'bg-emerald-500' },
          { label: 'In Transit', value: stats.inTransit, colorClass: 'bg-amber-500' },
          { label: 'Dispatched', value: stats.dispatched, colorClass: 'bg-blue-500' },
          { label: 'Arrived', value: stats.arrived, colorClass: 'bg-purple-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
            <div className={`w-2 h-8 rounded-full ${s.colorClass}`} />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500">
            <MapPinIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No active shipments to display on the map</p>
            <p className="text-xs mt-1">Shipments with status &quot;Dispatched&quot; or later will appear here</p>
          </div>
        ) : (
          <div className="relative w-full overflow-hidden" style={{ minHeight: '400px' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto"
              style={{ minHeight: '400px' }}
            >
              {/* Background */}
              <defs>
                <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </radialGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="pulseGlow">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Ocean background */}
              <rect width={svgWidth} height={svgHeight} fill="url(#bgGrad)" rx="12" />

              {/* Grid lines */}
              {Array.from({ length: 7 }, (_, i) => {
                const x = (i + 1) * (svgWidth / 8);
                return <line key={`v${i}`} x1={x} y1="0" x2={x} y2={svgHeight} stroke="#1e293b" strokeWidth="0.5" />;
              })}
              {Array.from({ length: 5 }, (_, i) => {
                const y = (i + 1) * (svgHeight / 6);
                return <line key={`h${i}`} x1="0" y1={y} x2={svgWidth} y2={y} stroke="#1e293b" strokeWidth="0.5" />;
              })}

              {/* Simplified continent outlines */}
              {/* Africa */}
              <path d="M 420,120 Q 440,130 450,160 Q 460,200 455,240 Q 450,280 440,310 Q 430,340 410,350 Q 390,345 380,320 Q 370,290 375,250 Q 380,200 390,160 Q 400,130 420,120 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
              {/* Europe */}
              <path d="M 400,70 Q 430,65 450,75 Q 470,85 480,100 Q 475,115 460,120 Q 440,118 425,110 Q 410,100 400,85 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
              {/* Middle East */}
              <path d="M 480,120 Q 510,115 530,130 Q 545,150 540,175 Q 530,190 510,195 Q 490,190 480,170 Q 475,145 480,120 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
              {/* Asia (partial) */}
              <path d="M 540,70 Q 580,55 640,60 Q 700,65 740,80 Q 770,100 780,130 Q 775,160 760,185 Q 740,200 700,210 Q 660,215 620,210 Q 580,200 555,180 Q 535,155 530,125 Q 530,95 540,70 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
              {/* China */}
              <path d="M 650,110 Q 680,100 710,110 Q 740,125 755,150 Q 760,175 745,195 Q 720,210 690,205 Q 660,195 645,170 Q 640,145 650,110 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.8" opacity="0.9" />
              {/* South America */}
              <path d="M 230,180 Q 250,170 265,190 Q 275,220 270,260 Q 260,300 245,330 Q 230,350 215,340 Q 205,310 210,270 Q 215,230 230,180 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
              {/* North America */}
              <path d="M 100,70 Q 140,55 180,60 Q 220,70 240,100 Q 245,130 235,160 Q 220,180 190,190 Q 160,185 135,170 Q 110,150 95,120 Q 85,95 100,70 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
              {/* Australia */}
              <path d="M 720,300 Q 750,290 775,305 Q 785,325 775,345 Q 755,355 735,345 Q 720,330 720,300 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />

              {/* Route lines and shipment markers */}
              {shipments.map((s) => {
                const origin = latLngToXY(s.originCoordinates.lat, s.originCoordinates.lng, svgWidth, svgHeight);
                const dest = latLngToXY(s.coordinates.lat, s.coordinates.lng, svgWidth, svgHeight);
                const current = latLngToXY(s.currentLocation.lat, s.currentLocation.lng, svgWidth, svgHeight);
                const color = STATUS_COLORS[s.status] || '#6b7280';
                const isHovered = hoveredId === s.id;

                // Curved route path
                const midX = (origin.x + dest.x) / 2;
                const midY = Math.min(origin.y, dest.y) - 30;
                const pathD = `M ${origin.x},${origin.y} Q ${midX},${midY} ${dest.x},${dest.y}`;

                return (
                  <g key={s.id}>
                    {/* Route line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isHovered ? color : `${color}40`}
                      strokeWidth={isHovered ? 2 : 1}
                      strokeDasharray={s.status === 'IN_TRANSIT' ? '4 3' : 'none'}
                    >
                      {s.status === 'IN_TRANSIT' && (
                        <animate
                          attributeName="stroke-dashoffset"
                          from="0"
                          to="-14"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      )}
                    </path>

                    {/* Origin dot (China) */}
                    <circle
                      cx={origin.x}
                      cy={origin.y}
                      r={isHovered ? 4 : 3}
                      fill="#059669"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />

                    {/* Destination dot */}
                    <circle
                      cx={dest.x}
                      cy={dest.y}
                      r={isHovered ? 5 : 3.5}
                      fill={color}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />

                    {/* Current position marker (animated for in-transit) */}
                    <circle
                      cx={current.x}
                      cy={current.y}
                      r={isHovered ? 6 : 4}
                      fill={color}
                      filter="url(#glow)"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="cursor-pointer"
                      onMouseEnter={(e) => handleMarkerHover(s, e)}
                      onMouseLeave={handleMarkerLeave}
                      onClick={() => handleShipmentClick(s)}
                    />

                    {/* Pulse animation for in-transit */}
                    {s.status === 'IN_TRANSIT' && (
                      <circle
                        cx={current.x}
                        cy={current.y}
                        r="4"
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        opacity="0.6"
                      >
                        <animate attributeName="r" from="4" to="16" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Shipping method icon at current position */}
                    {s.shippingMethod === 'AIR' && (
                      <text
                        x={current.x + 8}
                        y={current.y - 8}
                        fill={color}
                        fontSize="10"
                        fontFamily="sans-serif"
                      >
                        ✈
                      </text>
                    )}
                    {s.shippingMethod === 'SEA' && (
                      <text
                        x={current.x + 8}
                        y={current.y - 8}
                        fill={color}
                        fontSize="10"
                        fontFamily="sans-serif"
                      >
                        ⚓
                      </text>
                    )}
                    {s.shippingMethod === 'LAND' && (
                      <text
                        x={current.x + 8}
                        y={current.y - 8}
                        fill={color}
                        fontSize="10"
                        fontFamily="sans-serif"
                      >
                        🚛
                      </text>
                    )}
                  </g>
                );
              })}

              {/* China label */}
              <text x={680} y={170} fill="#475569" fontSize="9" fontFamily="sans-serif" textAnchor="middle">CHINA</text>
              <text x={680} y={182} fill="#334155" fontSize="7" fontFamily="sans-serif" textAnchor="middle">Origin</text>
            </svg>

            {/* Tooltip */}
            {hoveredShipment && tooltipPos && (
              <div
                className="absolute z-10 bg-slate-900/95 backdrop-blur-sm text-white rounded-lg px-4 py-3 shadow-2xl border border-slate-700 pointer-events-none"
                style={{
                  left: `${(tooltipPos.x / svgWidth) * 100}%`,
                  top: `${(tooltipPos.y / svgHeight) * 100 + 4}%`,
                  transform: 'translate(-50%, 8px)',
                  maxWidth: '240px',
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[hoveredShipment.status] }} />
                  <span className="text-xs font-mono text-slate-300">{hoveredShipment.shipmentId}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Status</span>
                    <span className="font-medium" style={{ color: STATUS_COLORS[hoveredShipment.status] }}>
                      {STATUS_LABELS[hoveredShipment.status]}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Destination</span>
                    <span className="text-slate-200">{hoveredShipment.destinationCity}, {hoveredShipment.destinationCountry}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Method</span>
                    <span className="text-slate-200">{hoveredShipment.shippingMethod}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Location</span>
                    <span className="text-slate-200">{hoveredShipment.currentLocation.label}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Click to view shipment details</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Status:</span>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[key] }} />
            <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
          </div>
        ))}
        <div className="border-l border-slate-200 dark:border-slate-700 pl-4 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-600 dark:text-slate-300">Origin (China)</span>
        </div>
      </div>

      {/* Shipment List below map */}
      {shipments.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Active Shipments ({shipments.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
            {shipments.map((s) => (
              <div
                key={s.id}
                onClick={() => handleShipmentClick(s)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[s.status] }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-900 dark:text-slate-100">{s.shipmentId}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${STATUS_COLORS[s.status]}20`, color: STATUS_COLORS[s.status] }}>
                      {STATUS_LABELS[s.status]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {s.destinationCity}, {s.destinationCountry} — {s.shippingMethod}
                  </p>
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                  {s.currentLocation.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
