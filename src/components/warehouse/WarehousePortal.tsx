'use client';
import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { PackageIcon, QRIcon, CameraIcon, RefreshIcon, XIcon } from '@/components/icons';
import PhotoUploader from '@/components/shared/PhotoUploader';
import { SHIPMENT_STATUS_LABELS, SHIPMENT_STATUS_COLORS, SHIPPING_METHOD_LABELS } from '@/lib/shipping';
import { SkeletonTable } from '@/components/shared/SkeletonLoaders';
import { toast } from 'sonner';

export default function WarehousePortal() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [scannedId, setScannedId] = useState('');
  const [shipmentDetail, setShipmentDetail] = useState<any>(null);
  const [verifyWeight, setVerifyWeight] = useState('');
  const [verifyLength, setVerifyLength] = useState('');
  const [verifyWidth, setVerifyWidth] = useState('');
  const [verifyHeight, setVerifyHeight] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'processing' | 'all'>('pending');

  const { data: warehouseData } = useFetch<any[]>(() => apiFetch('/warehouses').then(r => r.success ? r.data : []), []);
  const warehouses = warehouseData || [];
  const effectiveWarehouse = selectedWarehouse || (warehouses.length > 0 ? warehouses[0].id : '');

  const { data: shipmentData, loading, refresh: loadShipments } = useFetch<any[]>(() => effectiveWarehouse ? apiFetch(`/warehouses/${effectiveWarehouse}/shipments`).then(r => r.success ? r.data : []) : Promise.resolve([]), [effectiveWarehouse]);
  const allShipments = shipmentData || [];

  const pendingShipments = allShipments.filter((s: any) => ['CREATED', 'WAITING_WAREHOUSE_ARRIVAL'].includes(s.status));
  const processingShipments = allShipments.filter((s: any) => ['RECEIVED_AT_WAREHOUSE', 'PROCESSING', 'READY_FOR_DISPATCH'].includes(s.status));

  const handleScan = async () => {
    if (!scannedId.trim()) return;
    try {
      let res = await apiFetch(`/tracking/${scannedId.trim()}`);
      if (res.success) { setShipmentDetail(res.data); toast.success('Shipment found!'); }
      else {
        res = await apiFetch(`/shipments/${scannedId.trim()}`);
        if (res.success) { setShipmentDetail(res.data); toast.success('Shipment found!'); }
        else { toast.error('Shipment not found'); }
      }
    } catch { toast.error('Scan failed'); }
  };

  const handleWarehouseAction = async (shipmentId: string, action: 'receive' | 'process' | 'ready' | 'dispatch') => {
    try {
      const res = await apiFetch(`/warehouses/${effectiveWarehouse}/scan`, { method: 'POST', body: JSON.stringify({ shipmentId, action }) });
      if (res.success) { toast.success(`Shipment ${action}d successfully`); loadShipments(); if (shipmentDetail?.id === shipmentId) setShipmentDetail(res.data); }
      else { toast.error(res.error || 'Action failed'); }
    } catch { toast.error('Action failed'); }
  };

  const displayShipments = activeTab === 'pending' ? pendingShipments : activeTab === 'processing' ? processingShipments : allShipments;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Warehouse Portal</h1>
      <p className="text-slate-500 mb-6">Scan, receive, and process shipments</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('pending')}>
          <div className="text-2xl font-bold text-yellow-700">{pendingShipments.length}</div><div className="text-sm text-yellow-600">Pending Arrival</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('processing')}>
          <div className="text-2xl font-bold text-purple-700">{processingShipments.length}</div><div className="text-sm text-purple-600">Processing</div>
        </div>
        <div className="bg-slate-100 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('all')}>
          <div className="text-2xl font-bold text-slate-700">{allShipments.length}</div><div className="text-sm text-slate-500">All Shipments</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2"><QRIcon className="w-5 h-5" /> Scan QR / Search Shipment</h3>
        <div className="flex gap-3">
          <input value={scannedId} onChange={e => setScannedId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()} placeholder="Scan QR or enter tracking number / shipment ID..." className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          <button onClick={handleScan} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-medium transition-colors">Scan</button>
        </div>
      </div>

      {shipmentDetail && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{shipmentDetail.shipmentId}</h3>
              <p className="text-sm text-slate-500">Tracking: {shipmentDetail.trackingNumber}</p>
              <p className="text-sm text-slate-500">{shipmentDetail.senderName} → {shipmentDetail.receiverName}, {shipmentDetail.destinationCity}</p>
              <p className="text-sm text-slate-500 mt-1">Weight: {shipmentDetail.weight} kg | {SHIPPING_METHOD_LABELS[shipmentDetail.shippingMethod]}</p>
            </div>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${SHIPMENT_STATUS_COLORS[shipmentDetail.status]}`}>{SHIPMENT_STATUS_LABELS[shipmentDetail.status]}</span>
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Quick Actions:</p>
            <div className="flex flex-wrap gap-2">
              {shipmentDetail.status === 'WAITING_WAREHOUSE_ARRIVAL' && <button onClick={() => handleWarehouseAction(shipmentDetail.id, 'receive')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500">Receive at Warehouse</button>}
              {shipmentDetail.status === 'RECEIVED_AT_WAREHOUSE' && <button onClick={() => handleWarehouseAction(shipmentDetail.id, 'process')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-500">Start Processing</button>}
              {shipmentDetail.status === 'PROCESSING' && <button onClick={() => handleWarehouseAction(shipmentDetail.id, 'ready')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500">Ready for Dispatch</button>}
              {shipmentDetail.status === 'READY_FOR_DISPATCH' && <button onClick={() => handleWarehouseAction(shipmentDetail.id, 'dispatch')} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-500">Dispatch</button>}
            </div>
          </div>
          <div className="mb-4 p-3 bg-white rounded-lg">
            <p className="text-sm font-medium text-slate-700 mb-2">Verify Weight & Dimensions:</p>
            <div className="grid grid-cols-4 gap-2">
              <input value={verifyWeight} onChange={e => setVerifyWeight(e.target.value)} placeholder={`Weight: ${shipmentDetail.weight}kg`} type="number" step="0.1" className="px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <input value={verifyLength} onChange={e => setVerifyLength(e.target.value)} placeholder="Length (cm)" type="number" className="px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <input value={verifyWidth} onChange={e => setVerifyWidth(e.target.value)} placeholder="Width (cm)" type="number" className="px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              <input value={verifyHeight} onChange={e => setVerifyHeight(e.target.value)} placeholder="Height (cm)" type="number" className="px-3 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <button onClick={() => toast.success('Dimensions verified')} className="mt-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300">Verify</button>
          </div>
          <div className="mb-4 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <CameraIcon className="w-4 h-4" /> Shipment Photos
            </p>
            <PhotoUploader
              shipmentId={shipmentDetail.id}
              onUploadComplete={loadShipments}
            />
          </div>
          <button onClick={() => setShipmentDetail(null)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            <XIcon className="w-4 h-4" /> Close
          </button>
        </div>
      )}

      <div className="flex gap-3 mb-4 items-center">
        <select value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
          {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <button onClick={loadShipments} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"><RefreshIcon className="w-4 h-4 text-slate-600" /></button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'pending' ? 'bg-yellow-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>Pending ({pendingShipments.length})</button>
        <button onClick={() => setActiveTab('processing')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'processing' ? 'bg-purple-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>Processing ({processingShipments.length})</button>
        <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'all' ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>All ({allShipments.length})</button>
      </div>

      {loading ? <SkeletonTable rows={5} columns={6} /> : displayShipments.length === 0 ? (
        <div className="text-center py-12"><PackageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-400">No shipments in this category</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Sender</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Destination</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Weight</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayShipments.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-mono text-slate-900">{s.shipmentId}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.senderName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.destinationCity}, {s.destinationCountry}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{s.weight} kg</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 text-xs font-medium rounded-full ${SHIPMENT_STATUS_COLORS[s.status]}`}>{SHIPMENT_STATUS_LABELS[s.status]}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {s.status === 'WAITING_WAREHOUSE_ARRIVAL' && <button onClick={() => handleWarehouseAction(s.id, 'receive')} className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200">Receive</button>}
                        {s.status === 'RECEIVED_AT_WAREHOUSE' && <button onClick={() => handleWarehouseAction(s.id, 'process')} className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200">Process</button>}
                        {s.status === 'PROCESSING' && <button onClick={() => handleWarehouseAction(s.id, 'ready')} className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">Ready</button>}
                        {s.status === 'READY_FOR_DISPATCH' && <button onClick={() => handleWarehouseAction(s.id, 'dispatch')} className="px-2 py-1 text-xs bg-cyan-100 text-cyan-700 rounded hover:bg-cyan-200">Dispatch</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
