'use client';

import React from 'react';
import { PlaneIcon, ShipIcon, TruckIcon, PackageIcon, MapPinIcon } from '@/components/icons';
import { SHIPPING_METHOD_LABELS, SHIPMENT_TYPE_LABELS } from '@/lib/shipping';

// ─── Types ──────────────────────────────────────────────

export interface ShippingLabelData {
  shipmentId: string;
  trackingNumber: string;
  senderName: string;
  senderPhone?: string;
  senderAddress?: string;
  receiverName: string;
  receiverPhone?: string;
  receiverAddress?: string;
  originCountry: string;
  originCity?: string;
  destinationCountry: string;
  destinationCity: string;
  shippingMethod: string;
  shipmentType: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  shipmentValue: number;
  productDescription: string;
  numberOfPackages?: number;
  qrCodeUrl: string;
  trackingUrl: string;
  warehouseName?: string;
  warehouseCity?: string;
  createdAt: string;
  estimatedDelivery?: string;
}

interface ShippingLabelProps {
  data: ShippingLabelData;
  /** 'inline' = compact card preview, 'full' = print-ready full page */
  mode?: 'inline' | 'full';
  /** For bulk printing, index in the set */
  index?: number;
  /** Total labels being printed */
  total?: number;
}

// ─── Barcode SVG Generator ──────────────────────────────

function generateBarcodeSVG(text: string): string {
  // Generate a Code 128-style visual barcode representation
  const chars = text.split('');
  const barWidth = 2;
  const barHeight = 50;
  let x = 0;
  let paths = '';

  // Simple encoding: alternate bars based on character codes
  const seed = chars.reduce((acc, c) => acc + c.charCodeAt(0), 0);
  let bars: { x: number; w: number }[] = [];

  // Start guard
  bars.push({ x: 0, w: barWidth });
  x += barWidth * 2;

  // Encode each character
  chars.forEach((char, i) => {
    const code = char.charCodeAt(0);
    // Use deterministic pattern based on char code and position
    const pattern = ((code * 7 + i * 13 + seed) % 100);
    const numBars = 2 + (pattern % 3);

    for (let b = 0; b < numBars; b++) {
      const barOffset = ((code + b * 17 + i * 3) % 5);
      bars.push({ x: x + barOffset, w: barWidth * (1 + (barOffset % 2)) });
      x += barWidth * (2 + (barOffset % 2));
    }
    x += barWidth; // quiet zone between chars
  });

  // End guard
  bars.push({ x, w: barWidth * 2 });

  const totalWidth = x + barWidth * 4;
  paths = bars.map(b => `<rect x="${b.x}" y="0" width="${b.w}" height="${barHeight}" fill="black" />`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${barHeight + 4}" width="${totalWidth}" height="${barHeight + 4}">${paths}</svg>`;
}

// ─── Shipping Method Icon ───────────────────────────────

function ShippingMethodBadge({ method, className = '' }: { method: string; className?: string }) {
  const config: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    AIR: { icon: <PlaneIcon className="w-4 h-4" />, label: 'AIR FREIGHT', color: 'bg-sky-100 text-sky-800 border-sky-300' },
    SEA: { icon: <ShipIcon className="w-4 h-4" />, label: 'SEA FREIGHT', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    LAND: { icon: <TruckIcon className="w-4 h-4" />, label: 'LAND FREIGHT', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  };

  const cfg = config[method] || config.LAND;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded border tracking-wider ${cfg.color} ${className}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Fragile / This Side Up Indicator ───────────────────

function HandlingIndicator({ shipmentType, shipmentValue }: { shipmentType: string; shipmentValue: number }) {
  const isFragile = shipmentValue >= 500 || shipmentType === 'FCL';
  const isThisSideUp = shipmentType !== 'PARCEL';

  if (!isFragile && !isThisSideUp) return null;

  return (
    <div className="label-handling flex items-center gap-2 justify-center">
      {isFragile && (
        <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border-2 border-red-400 rounded">
          <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" x2="12" y1="9" y2="13"/>
            <line x1="12" x2="12.01" y1="17" y2="17"/>
          </svg>
          <span className="text-xs font-black text-red-600 tracking-widest">FRAGILE</span>
        </div>
      )}
      {isThisSideUp && (
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border-2 border-amber-400 rounded">
          <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
          </svg>
          <span className="text-xs font-black text-amber-600 tracking-widest">THIS SIDE UP</span>
        </div>
      )}
    </div>
  );
}

// ─── Main ShippingLabel Component ───────────────────────

export default function ShippingLabel({ data, mode = 'inline', index, total }: ShippingLabelProps) {
  const barcodeSvg = generateBarcodeSVG(data.trackingNumber);
  const barcodeDataUri = `data:image/svg+xml;base64,${btoa(barcodeSvg)}`;

  const shipmentTypeLabel = SHIPMENT_TYPE_LABELS[data.shipmentType] || data.shipmentType;
  const shippingMethodLabel = SHIPPING_METHOD_LABELS[data.shippingMethod] || data.shippingMethod;

  // ─── Inline Mode (compact card) ──────────────────────
  if (mode === 'inline') {
    return (
      <div className="shipping-label-inline bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShipIcon className="w-5 h-5 text-white" />
            <span className="text-white font-bold text-sm tracking-wide">ARWA LOGISTICS</span>
          </div>
          <ShippingMethodBadge method={data.shippingMethod} className="!bg-white/20 !text-white !border-white/30" />
        </div>

        <div className="p-4">
          {/* Tracking & QR Row */}
          <div className="flex gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Tracking Number</p>
              <p className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">{data.trackingNumber}</p>
              {/* Barcode */}
              <div className="mt-1.5">
                <img src={barcodeDataUri} alt="Barcode" className="h-8 w-auto max-w-full" />
              </div>
              <p className="text-[9px] text-slate-400 mt-1 font-mono">{data.shipmentId}</p>
            </div>
            <div className="shrink-0">
              <img
                src={data.qrCodeUrl}
                alt="QR Code"
                className="w-20 h-20 rounded border border-slate-200 dark:border-slate-600"
                crossOrigin="anonymous"
              />
            </div>
          </div>

          {/* Route */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 mb-3">
            <MapPinIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{data.originCountry}</span>
            <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            <MapPinIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{data.destinationCity}, {data.destinationCountry}</span>
          </div>

          {/* Sender / Receiver */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">From</p>
              <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{data.senderName}</p>
              {data.senderPhone && <p className="text-[10px] text-slate-500 truncate">{data.senderPhone}</p>}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">To</p>
              <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{data.receiverName}</p>
              {data.receiverPhone && <p className="text-[10px] text-slate-500 truncate">{data.receiverPhone}</p>}
            </div>
          </div>

          {/* Details */}
          <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 mb-2">
            <span className="flex items-center gap-1"><PackageIcon className="w-3 h-3" />{data.weight} kg</span>
            {data.length && <span>{data.length}×{data.width}×{data.height} cm</span>}
            <span>{shipmentTypeLabel}</span>
            {data.numberOfPackages && <span>{data.numberOfPackages} pkg(s)</span>}
          </div>

          {/* Handling indicators */}
          <HandlingIndicator shipmentType={data.shipmentType} shipmentValue={data.shipmentValue} />
        </div>
      </div>
    );
  }

  // ─── Full Mode (print-ready 4x6 inch label) ──────────
  return (
    <div className="shipping-label-print" data-label-index={index ?? 0}>
      <div className="label-page" style={{
        width: '4in',
        minHeight: '6in',
        maxWidth: '4in',
        padding: '0.15in',
        margin: '0 auto',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        background: 'white',
        color: '#000',
        boxSizing: 'border-box',
        pageBreakAfter: (index !== undefined && total !== undefined && index < total - 1) ? 'always' : 'auto',
      }}>
        {/* Outer border */}
        <div style={{
          border: '2px solid #000',
          height: '100%',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {/* ── Header ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid #059669',
            paddingBottom: '6px',
            marginBottom: '2px',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px', color: '#059669' }}>ARWA LOGISTICS</div>
              <div style={{ fontSize: '7px', color: '#666', letterSpacing: '0.5px' }}>Global Shipping Platform</div>
            </div>
            <div style={{
              background: data.shippingMethod === 'AIR' ? '#0284c7' : data.shippingMethod === 'SEA' ? '#1d4ed8' : '#b45309',
              color: 'white',
              padding: '3px 8px',
              fontSize: '9px',
              fontWeight: 'bold',
              borderRadius: '3px',
              letterSpacing: '1px',
            }}>
              {data.shippingMethod === 'AIR' ? '✈ AIR' : data.shippingMethod === 'SEA' ? '🚢 SEA' : '🚛 LAND'} FREIGHT
            </div>
          </div>

          {/* ── Shipment ID ── */}
          <div style={{
            fontSize: '15px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            textAlign: 'center',
            letterSpacing: '1.5px',
            padding: '3px 0',
          }}>
            {data.shipmentId}
          </div>

          {/* ── Tracking Number + Barcode ── */}
          <div style={{ textAlign: 'center', marginBottom: '2px' }}>
            <div style={{
              fontSize: '8px',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '2px',
            }}>Tracking Number</div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: 'bold',
              color: '#059669',
              letterSpacing: '1px',
            }}>
              {data.trackingNumber}
            </div>
            <div style={{ marginTop: '2px' }}>
              <img src={barcodeDataUri} alt="Barcode" style={{ height: '32px', width: 'auto', maxWidth: '100%', display: 'inline-block' }} />
            </div>
          </div>

          {/* ── Route Section ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f0fdf4',
            padding: '5px 8px',
            borderRadius: '4px',
            border: '1px solid #bbf7d0',
          }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Origin</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#000' }}>{data.originCity || 'China'}</div>
              <div style={{ fontSize: '8px', color: '#666' }}>{data.originCountry}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0 8px' }}>
              <div style={{ fontSize: '16px', color: '#059669', fontWeight: 'bold' }}>→</div>
              <div style={{ fontSize: '6px', color: '#059669' }}>{shippingMethodLabel}</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>Destination</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#000' }}>{data.destinationCity}</div>
              <div style={{ fontSize: '8px', color: '#666' }}>{data.destinationCountry}</div>
            </div>
          </div>

          {/* ── Sender / Receiver ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '4px 6px' }}>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', color: '#059669', fontWeight: 'bold', letterSpacing: '0.5px', marginBottom: '2px' }}>Sender</div>
              <div style={{ fontSize: '9px', fontWeight: '600', lineHeight: '1.3' }}>{data.senderName}</div>
              {data.senderPhone && <div style={{ fontSize: '8px', color: '#666' }}>{data.senderPhone}</div>}
              {data.senderAddress && <div style={{ fontSize: '7px', color: '#888', marginTop: '1px' }}>{data.senderAddress}</div>}
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '4px 6px' }}>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', color: '#059669', fontWeight: 'bold', letterSpacing: '0.5px', marginBottom: '2px' }}>Receiver</div>
              <div style={{ fontSize: '9px', fontWeight: '600', lineHeight: '1.3' }}>{data.receiverName}</div>
              {data.receiverPhone && <div style={{ fontSize: '8px', color: '#666' }}>{data.receiverPhone}</div>}
              {data.receiverAddress && <div style={{ fontSize: '7px', color: '#888', marginTop: '1px' }}>{data.receiverAddress}</div>}
            </div>
          </div>

          {/* ── Shipment Details Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', fontSize: '8px' }}>
            <div>
              <span style={{ color: '#999', textTransform: 'uppercase', fontSize: '6px', letterSpacing: '0.5px' }}>Weight</span>
              <div style={{ fontWeight: '600', fontSize: '9px' }}>{data.weight} kg</div>
            </div>
            <div>
              <span style={{ color: '#999', textTransform: 'uppercase', fontSize: '6px', letterSpacing: '0.5px' }}>Type</span>
              <div style={{ fontWeight: '600', fontSize: '9px' }}>{shipmentTypeLabel}</div>
            </div>
            <div>
              <span style={{ color: '#999', textTransform: 'uppercase', fontSize: '6px', letterSpacing: '0.5px' }}>Value</span>
              <div style={{ fontWeight: '600', fontSize: '9px' }}>${data.shipmentValue.toLocaleString()}</div>
            </div>
            {data.length && (
              <>
                <div>
                  <span style={{ color: '#999', textTransform: 'uppercase', fontSize: '6px', letterSpacing: '0.5px' }}>Dimensions</span>
                  <div style={{ fontWeight: '600', fontSize: '9px' }}>{data.length}×{data.width}×{data.height} cm</div>
                </div>
              </>
            )}
            <div>
              <span style={{ color: '#999', textTransform: 'uppercase', fontSize: '6px', letterSpacing: '0.5px' }}>Packages</span>
              <div style={{ fontWeight: '600', fontSize: '9px' }}>{data.numberOfPackages || 1}</div>
            </div>
            <div>
              <span style={{ color: '#999', textTransform: 'uppercase', fontSize: '6px', letterSpacing: '0.5px' }}>Product</span>
              <div style={{ fontWeight: '600', fontSize: '9px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.productDescription}</div>
            </div>
          </div>

          {/* ── Handling Indicators ── */}
          {(data.shipmentValue >= 500 || data.shipmentType !== 'PARCEL') && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              padding: '3px 0',
            }}>
              {data.shipmentValue >= 500 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  border: '2px solid #dc2626',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  background: '#fef2f2',
                }}>
                  <span style={{ fontSize: '12px' }}>⚠</span>
                  <span style={{ fontSize: '9px', fontWeight: '900', color: '#dc2626', letterSpacing: '2px' }}>FRAGILE</span>
                </div>
              )}
              {data.shipmentType !== 'PARCEL' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  border: '2px solid #d97706',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  background: '#fffbeb',
                }}>
                  <span style={{ fontSize: '12px' }}>↑</span>
                  <span style={{ fontSize: '9px', fontWeight: '900', color: '#d97706', letterSpacing: '1px' }}>THIS SIDE UP</span>
                </div>
              )}
            </div>
          )}

          {/* ── QR Code Section ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: 'auto',
            paddingTop: '4px',
            borderTop: '1px dashed #d1d5db',
          }}>
            <img
              src={data.qrCodeUrl}
              alt="QR Code"
              crossOrigin="anonymous"
              style={{ width: '70px', height: '70px' }}
            />
            <div style={{ fontSize: '7px', color: '#888', textAlign: 'left', maxWidth: '120px' }}>
              <div style={{ fontWeight: 'bold', color: '#059669', fontSize: '8px' }}>Scan to Track</div>
              <div style={{ marginTop: '2px', wordBreak: 'break-all' }}>{data.trackingUrl}</div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{
            fontSize: '6px',
            textAlign: 'center',
            color: '#aaa',
            borderTop: '1px solid #e5e7eb',
            paddingTop: '3px',
            marginTop: '2px',
          }}>
            ARWA LOGISTICS — Shipping from China to the World | Printed: {new Date().toLocaleDateString()} | {data.shipmentId}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shipping Label Page (Full-screen print view) ──────

interface ShippingLabelPageProps {
  labels: ShippingLabelData[];
  onClose: () => void;
}

export function ShippingLabelPage({ labels, onClose }: ShippingLabelPageProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Action bar - hidden in print */}
      <div className="label-action-bar print-hide sticky top-0 z-50 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
            </svg>
            Back
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {labels.length} Label{labels.length !== 1 ? 's' : ''} Ready
          </span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>
          </svg>
          Print Labels
        </button>
      </div>

      {/* Labels container */}
      <div className="label-container p-6 flex flex-col items-center gap-6">
        {labels.map((label, i) => (
          <ShippingLabel key={label.shipmentId} data={label} mode="full" index={i} total={labels.length} />
        ))}
      </div>
    </div>
  );
}
