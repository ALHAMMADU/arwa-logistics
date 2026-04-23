'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeftIcon, ClipboardIcon, DownloadIcon, QRIcon, MapPinIcon,
  CameraIcon, FileTextIcon, ShareIcon, MailIcon, CheckIcon,
  CheckCircleIcon, PrintIcon, CreditCardIcon
} from '@/components/icons';
import PhotoUploader from '@/components/shared/PhotoUploader';
import PhotoGallery from '@/components/shared/PhotoGallery';
import { SHIPMENT_STATUS_LABELS, SHIPMENT_STATUS_COLORS, SHIPPING_METHOD_LABELS, SHIPMENT_TYPE_LABELS } from '@/lib/shipping';
import { STATUS_FLOW, getStatusProgress } from '@/lib/status-flow';
import { toast } from 'sonner';
import { SkeletonCard, SkeletonTimeline } from '@/components/shared/SkeletonLoaders';
import ShipmentNotes from '@/components/shared/ShipmentNotes';
import ShippingLabel from '@/components/shared/ShippingLabel';
import { ShippingLabelData } from '@/components/shared/ShippingLabel';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ShipmentDetailPage() {
  const { selectedShipmentId, setCurrentPage, user, setLabelShipmentIds } = useAppStore();
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [labelData, setLabelData] = useState<ShippingLabelData | null>(null);
  const [labelLoading, setLabelLoading] = useState(false);
  const [showLabelPreview, setShowLabelPreview] = useState(false);
  const qrImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (selectedShipmentId) {
      apiFetch(`/shipments/${selectedShipmentId}`).then(r => {
        if (r.success) setShipment(r.data);
        setLoading(false);
      });
    }
  }, [selectedShipmentId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleDownloadQR = async () => {
    if (!shipment) return;
    const trackingUrl = `${window.location.origin}/tracking/${shipment.trackingNumber}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(trackingUrl)}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR-${shipment.trackingNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('QR Code downloaded!');
    } catch {
      toast.error('Failed to download QR code');
    }
  };

  const handlePrintLabel = () => {
    // Navigate to shipping-label page for a single shipment
    setLabelShipmentIds([selectedShipmentId!]);
    setCurrentPage('shipping-label');
  };

  const handleLoadLabelData = async () => {
    if (!selectedShipmentId || labelData) return;
    setLabelLoading(true);
    try {
      const res = await apiFetch(`/shipments/${selectedShipmentId}/label?format=json`);
      if (res.success) {
        setLabelData(res.data);
      } else {
        toast.error('Failed to load label data');
      }
    } catch {
      toast.error('Failed to load label data');
    }
    setLabelLoading(false);
  };

  const handlePrintLabelLegacy = () => {
    if (!shipment) return;
    const trackingUrl = `${window.location.origin}/tracking/${shipment.trackingNumber}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Shipping Label - ${shipment.shipmentId}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; }
          .label {
            width: 400px; margin: 0 auto; border: 3px solid #000; padding: 20px;
            page-break-after: always;
          }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
          .logo { font-size: 18px; font-weight: bold; color: #059669; }
          .shipment-id { font-size: 14px; font-family: monospace; font-weight: bold; }
          .qr-section { display: flex; gap: 20px; margin-bottom: 15px; }
          .qr-img { width: 150px; height: 150px; }
          .info { flex: 1; font-size: 12px; }
          .info-row { margin-bottom: 6px; }
          .info-label { font-weight: bold; color: #555; }
          .section { border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
          .section h3 { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 8px; letter-spacing: 1px; }
          .route { display: flex; align-items: center; justify-content: center; gap: 15px; font-size: 16px; padding: 10px; }
          .route-arrow { font-size: 24px; color: #059669; }
          .tracking { text-align: center; font-family: monospace; font-size: 16px; font-weight: bold; background: #f0fdf4; padding: 10px; border: 2px dashed #059669; border-radius: 4px; }
          @media print { body { padding: 0; } .label { border: 2px solid #000; } }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">
              <div class="logo">ARWA LOGISTICS</div>
              <div class="shipment-id">${shipment.shipmentId}</div>
            </div>
            <div class="qr-section">
              <img src="${qrUrl}" alt="QR Code" class="qr-img" />
              <div class="info">
                <div class="info-row"><span class="info-label">Method:</span> ${SHIPPING_METHOD_LABELS[shipment.shippingMethod]}</div>
                <div class="info-row"><span class="info-label">Type:</span> ${SHIPMENT_TYPE_LABELS[shipment.shipmentType]}</div>
                <div class="info-row"><span class="info-label">Weight:</span> ${shipment.weight} kg</div>
                ${shipment.length ? `<div class="info-row"><span class="info-label">Dims:</span> ${shipment.length}x${shipment.width}x${shipment.height} cm</div>` : ''}
                <div class="info-row"><span class="info-label">Value:</span> $${shipment.shipmentValue}</div>
                <div class="info-row"><span class="info-label">Product:</span> ${shipment.productDescription}</div>
              </div>
            </div>
            <div class="section">
              <h3>Route</h3>
              <div class="route">
                <span>China</span>
                <span class="route-arrow">&rarr;</span>
                <span>${shipment.destinationCity}, ${shipment.destinationCountry}</span>
              </div>
            </div>
            <div class="section">
              <h3>Sender</h3>
              <div>${shipment.senderName}${shipment.senderPhone ? ` - ${shipment.senderPhone}` : ''}</div>
            </div>
            <div class="section">
              <h3>Receiver</h3>
              <div>${shipment.receiverName}${shipment.receiverPhone ? ` - ${shipment.receiverPhone}` : ''}</div>
              <div>${shipment.receiverAddress || ''}</div>
            </div>
            <div class="tracking">${shipment.trackingNumber}</div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto">
      <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mb-6" />
      <SkeletonCard rows={4} showAvatar showFooter />
      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <SkeletonTimeline events={5} />
        </div>
        <div className="space-y-6">
          <SkeletonCard rows={3} />
          <SkeletonCard rows={4} />
        </div>
      </div>
    </div>
  );
  if (!shipment) return (
    <div className="text-center py-12 text-slate-400 dark:text-slate-500">Shipment not found</div>
  );

  const progress = getStatusProgress(shipment.status);
  const currentStatusIdx = STATUS_FLOW.indexOf(shipment.status as any);
  const trackingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/tracking/${shipment.trackingNumber}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(trackingUrl)}`;
  const mailtoLink = `mailto:?subject=Track Shipment ${shipment.trackingNumber}&body=Track your shipment with ARWA LOGISTICS:%0A%0ATracking Number: ${shipment.trackingNumber}%0ATracking URL: ${trackingUrl}%0A%0AThank you for choosing ARWA LOGISTICS.`;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => setCurrentPage('dashboard')}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-6 text-sm transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" /> Back
      </button>

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">{shipment.shipmentId}</h1>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${SHIPMENT_STATUS_COLORS[shipment.status]}`}>
                {SHIPMENT_STATUS_LABELS[shipment.status]}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Tracking: <span className="font-mono text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline" onClick={() => copyToClipboard(shipment.trackingNumber)}>{shipment.trackingNumber}</span>
              <ClipboardIcon className="w-3 h-3 inline text-slate-400 dark:text-slate-500 ml-1" />
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button onClick={handlePrintLabel} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm transition-colors">
              <PrintIcon className="w-4 h-4" /> Print Label
            </button>
            <button onClick={() => setCurrentPage('invoice')} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-600 text-sm transition-colors">
              <FileTextIcon className="w-4 h-4" /> Invoice
            </button>

            {/* Share Tracking Dialog */}
            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-sm transition-colors">
                  <ShareIcon className="w-4 h-4" /> Share
                </button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-slate-900 dark:text-white">Share Tracking Link</DialogTitle>
                  <DialogDescription className="text-slate-500 dark:text-slate-400">
                    Share this tracking link with your customer or team members.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Tracking URL</label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={trackingUrl}
                        className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(trackingUrl)}
                        className="border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 shrink-0"
                      >
                        <ClipboardIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Tracking Number</label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={shipment.trackingNumber}
                        className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(shipment.trackingNumber)}
                        className="border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 shrink-0"
                      >
                        <ClipboardIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <a
                    href={mailtoLink}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm transition-colors"
                  >
                    <MailIcon className="w-4 h-4" /> Share via Email
                  </a>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
          <div className="grid grid-cols-11 gap-0 mt-3">
            {STATUS_FLOW.map((status, i) => (
              <div key={status} className="text-center">
                <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${i <= currentStatusIdx ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}`} />
                <span className={`text-[8px] leading-tight block ${i <= currentStatusIdx ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-300 dark:text-slate-600'}`}>
                  {SHIPMENT_STATUS_LABELS[status].split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Label Preview Dialog */}
      <Dialog open={showLabelPreview} onOpenChange={setShowLabelPreview}>
        <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Shipping Label Preview</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Preview of your shipping label. Click Print to generate a printable version.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {labelLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : labelData ? (
              <ShippingLabel data={labelData} mode="inline" />
            ) : (
              <div className="text-center py-8 text-slate-400">Failed to load label</div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLabelPreview(false)}
              className="border-slate-200 dark:border-slate-600"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowLabelPreview(false);
                handlePrintLabel();
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <PrintIcon className="w-4 h-4 mr-2" /> Print Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipment Status Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-5">Shipment Status</h3>
            <div className="relative">
              {STATUS_FLOW.map((status, i) => {
                const isCompleted = i < currentStatusIdx;
                const isCurrent = i === currentStatusIdx;
                const isFuture = i > currentStatusIdx;
                const trackingEvent = (shipment.trackingEvents || []).find((e: any) => e.status === status);

                return (
                  <div key={status} className="flex gap-3 sm:gap-4 relative">
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                        isCurrent
                          ? 'bg-emerald-500 border-emerald-500 ring-4 ring-emerald-500/20'
                          : isCompleted
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                      }`}>
                        {isCompleted || isCurrent ? (
                          <CheckIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-500" />
                        )}
                      </div>
                      {i < STATUS_FLOW.length - 1 && (
                        <div className={`w-0.5 min-h-[2rem] sm:min-h-[2.5rem] ${
                          isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                        }`} />
                      )}
                    </div>
                    {/* Content */}
                    <div className={`pb-5 sm:pb-6 ${i === STATUS_FLOW.length - 1 ? 'pb-0' : ''}`}>
                      <p className={`text-sm font-medium ${
                        isCurrent
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isCompleted
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {SHIPMENT_STATUS_LABELS[status]}
                        {isCurrent && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                            Current
                          </span>
                        )}
                      </p>
                      {trackingEvent ? (
                        <div className="mt-1">
                          <p className="text-xs text-slate-400 dark:text-slate-500">{trackingEvent.location}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{new Date(trackingEvent.timestamp).toLocaleString()}</p>
                          {trackingEvent.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{trackingEvent.notes}</p>}
                        </div>
                      ) : isCompleted ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Completed</p>
                      ) : isFuture ? (
                        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Pending</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tracking Events Timeline */}
          {(shipment.trackingEvents || []).length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Tracking Events</h3>
              <div className="space-y-0">
                {(shipment.trackingEvents || []).map((event: any, i: number) => (
                  <div key={i} className="flex gap-3 sm:gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      {i < (shipment.trackingEvents?.length || 0) - 1 && <div className="w-0.5 h-12 bg-slate-200 dark:bg-slate-700" />}
                    </div>
                    <div className="pb-6">
                      <p className={`text-sm font-medium ${i === 0 ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                        {SHIPMENT_STATUS_LABELS[event.status] || event.status}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{event.location}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{new Date(event.timestamp).toLocaleString()}</p>
                      {event.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{event.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photos */}
          {(shipment.photos && shipment.photos.length > 0) && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <CameraIcon className="w-5 h-5" /> Shipment Photos
              </h3>
              {user && (user.role === 'ADMIN' || user.role === 'WAREHOUSE_STAFF') ? (
                <PhotoGallery
                  photos={shipment.photos}
                  editable={true}
                  onDelete={(photoId) => {
                    setShipment((prev: any) => ({
                      ...prev,
                      photos: prev.photos.filter((p: any) => p.id !== photoId),
                    }));
                    toast.success('Photo removed');
                  }}
                />
              ) : (
                <PhotoGallery photos={shipment.photos} editable={false} />
              )}
            </div>
          )}

          {/* Photo Upload Section - Only for ADMIN and WAREHOUSE_STAFF */}
          {user && (user.role === 'ADMIN' || user.role === 'WAREHOUSE_STAFF') && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <CameraIcon className="w-5 h-5" /> Upload Photos
              </h3>
              <PhotoUploader
                shipmentId={shipment.id}
                onUploadComplete={() => {
                  apiFetch(`/shipments/${shipment.id}`).then(r => {
                    if (r.success) setShipment(r.data);
                  });
                }}
              />
            </div>
          )}

          {/* Notes */}
          <ShipmentNotes shipmentId={shipment.id} />
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* QR Code */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 text-center">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center justify-center gap-2">
              <QRIcon className="w-5 h-5" /> QR Code
            </h3>
            <img
              ref={qrImgRef}
              src={qrApiUrl}
              alt="QR Code"
              className="mx-auto mb-3 rounded-lg"
              width={180}
              height={180}
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Scan to track shipment</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDownloadQR}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm transition-colors"
              >
                <DownloadIcon className="w-4 h-4" /> Download QR Code
              </button>
              <button
                onClick={handlePrintLabel}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 text-sm transition-colors"
              >
                <PrintIcon className="w-4 h-4" /> Print Label
              </button>
            </div>
          </div>

          {/* Shipment Info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Shipment Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Method</span><span className="text-slate-900 dark:text-white font-medium">{SHIPPING_METHOD_LABELS[shipment.shippingMethod]}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Type</span><span className="text-slate-900 dark:text-white font-medium">{SHIPMENT_TYPE_LABELS[shipment.shipmentType]}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Weight</span><span className="text-slate-900 dark:text-white font-medium">{shipment.weight} kg</span></div>
              {shipment.length && <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Dimensions</span><span className="text-slate-900 dark:text-white font-medium">{shipment.length}x{shipment.width}x{shipment.height} cm</span></div>}
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Value</span><span className="text-slate-900 dark:text-white font-medium">${shipment.shipmentValue}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Product</span><span className="text-slate-900 dark:text-white font-medium text-right max-w-[60%] truncate">{shipment.productDescription}</span></div>
            </div>
          </div>

          {/* Route */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Route</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-red-500" />
                <span className="text-slate-900 dark:text-white">China</span>
              </div>
              <div className="pl-2 border-l-2 border-emerald-300 dark:border-emerald-700 ml-1 h-4" />
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-900 dark:text-white">{shipment.destinationCity}, {shipment.destinationCountry}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => copyToClipboard(trackingUrl)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                <ClipboardIcon className="w-4 h-4" /> Copy Tracking Link
              </button>
              <button
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                <ShareIcon className="w-4 h-4" /> Share Tracking
              </button>
              <button
                onClick={handleDownloadQR}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                <DownloadIcon className="w-4 h-4" /> Download QR Code
              </button>
              <button
                onClick={handlePrintLabel}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                <PrintIcon className="w-4 h-4" /> Print Shipping Label
              </button>
              <button
                onClick={() => setCurrentPage('payment')}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 font-medium transition-colors"
              >
                <CreditCardIcon className="w-4 h-4" /> Pay Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
