'use client';

import React, { useState, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { useAppStore } from '@/lib/store';
import { SHIPMENT_STATUS_LABELS, SHIPMENT_STATUS_COLORS, SHIPPING_METHOD_LABELS, SHIPMENT_TYPE_LABELS } from '@/lib/shipping';
import { getNextStatuses } from '@/lib/status-flow';
import { toast } from 'sonner';
import { MapPinIcon, PackageIcon, UserIcon, DollarIcon, RefreshIcon, UploadCloudIcon, DownloadIcon, XIcon, CheckIcon, PrintIcon } from '@/components/icons';
import BulkActions from '@/components/shared/BulkActions';

// ─── CSV Template ────────────────────────────────────────

const CSV_TEMPLATE = `senderName,senderPhone,receiverName,receiverPhone,receiverAddress,destinationCountry,destinationCity,weight,length,width,height,productDescription,shipmentValue,shippingMethod,shipmentType
John Doe,+1234567890,Jane Smith,+0987654321,123 Main St,Saudi Arabia,Riyadh,5.5,30,20,15,Electronics,150,AIR,PARCEL
Alice Wang,+8612345678,Bob Ahmed,+96612345678,456 King Road,United Arab Emirates,Dubai,12.0,50,40,30,Furniture,500,SEA,LCL`;

// ─── Import Modal ────────────────────────────────────────

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
  totalRows: number;
}

function ImportModal({ onClose, onImportComplete }: { onClose: () => void; onImportComplete: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv') && f.type !== 'text/csv') {
      toast.error('Please select a CSV file');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }
    setFile(f);
    setResult(null);

    // Read and preview first 5 rows
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const headerLine = lines[0] || '';
      const headers = headerLine.split(',').map(h => h.trim());
      const dataLines = lines.slice(1, 6).map(l => l.split(',').map(c => c.trim()));
      setPreview([headers, ...dataLines]);
    };
    reader.readAsText(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('arwa_token') : null;
      const res = await fetch('/api/shipments/import', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        toast.success(`Import complete: ${data.data.success} shipments created`);
        onImportComplete();
      } else {
        toast.error(data.error || 'Import failed');
      }
    } catch {
      toast.error('Import failed');
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arwa_shipment_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Import Shipments from CSV</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Upload a CSV file to create shipments in bulk
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <XIcon className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Download Template */}
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <DownloadIcon className="w-4 h-4" />
            Download CSV Template
          </button>

          {/* File Upload Area */}
          {!result && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                  : file
                    ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10'
                    : 'border-slate-300 dark:border-slate-600 hover:border-emerald-300 hover:bg-slate-50 dark:hover:bg-slate-700/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                    <CheckIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{file.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB — Click to change file
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloudIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-500 mb-3" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Drag & drop your CSV file here
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    or click to browse — Max 5MB
                  </p>
                </>
              )}
            </div>
          )}

          {/* Preview */}
          {preview && !result && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Preview (first {preview.length - 1} rows)
              </h4>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-600 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      {preview[0].map((header, i) => (
                        <th key={i} className="px-2 py-1.5 text-left font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {preview.slice(1).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-2 py-1.5 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[120px] truncate">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Progress */}
          {importing && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <div className="w-5 h-5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Importing shipments...</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Please wait while we process your file</p>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                  <p className="text-2xl font-bold text-emerald-600">{result.success}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Created</p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">Failed</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
                  <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{result.totalRows}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Rows</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Error Details ({result.errors.length} errors)
                  </h4>
                  <div className="max-h-48 overflow-y-auto border border-red-200 dark:border-red-900/50 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-red-50 dark:bg-red-900/20 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-red-600 dark:text-red-400">Row</th>
                          <th className="px-3 py-2 text-left font-medium text-red-600 dark:text-red-400">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                        {result.errors.map((err, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400 font-mono">{err.row}</td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              {result ? 'Close' : 'Cancel'}
            </button>
            {!result && (
              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <UploadCloudIcon className="w-4 h-4" />
                    Import CSV
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

export default function AdminShipments() {
  const { setLabelShipmentIds, setCurrentPage } = useAppStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (methodFilter) params.set('method', methodFilter);
    if (typeFilter) params.set('type', typeFilter);
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    return params.toString();
  }, [statusFilter, startDate, endDate, methodFilter, typeFilter, page, limit]);

  const { data: shipmentData, loading, refresh: loadShipments } = useFetch<any>(
    () => apiFetch(`/shipments?${buildQuery()}`).then(r => r.success ? r.data : null),
    [buildQuery()]
  );

  const shipments = shipmentData?.shipments || [];
  const total = shipmentData?.total || 0;
  const pages = shipmentData?.pages || 1;
  const currentPage = shipmentData?.page || 1;

  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/shipments/${id}/status`, { method: 'POST', body: JSON.stringify({ status, location: 'Admin Update' }) });
      loadShipments();
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === shipments.length && shipments.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(shipments.map((s: any) => s.id));
    }
  };

  const clearSelection = () => setSelectedIds([]);
  const allSelected = shipments.length > 0 && selectedIds.length === shipments.length;

  // Reset page when filters change
  const handleStatusFilter = (val: string) => { setStatusFilter(val); setPage(1); setSelectedIds([]); };
  const handleStartDate = (val: string) => { setStartDate(val); setPage(1); setSelectedIds([]); };
  const handleEndDate = (val: string) => { setEndDate(val); setPage(1); setSelectedIds([]); };
  const handleMethodFilter = (val: string) => { setMethodFilter(val); setPage(1); setSelectedIds([]); };
  const handleTypeFilter = (val: string) => { setTypeFilter(val); setPage(1); setSelectedIds([]); };

  const clearFilters = () => {
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setMethodFilter('');
    setTypeFilter('');
    setPage(1);
    setSelectedIds([]);
  };

  const hasActiveFilters = statusFilter || startDate || endDate || methodFilter || typeFilter;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Shipments</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm transition-colors"
          >
            <UploadCloudIcon className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={loadShipments} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm transition-colors">
            <RefreshIcon className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => handleStatusFilter('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!statusFilter ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}>All ({total})</button>
        {Object.entries(SHIPMENT_STATUS_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => handleStatusFilter(key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusFilter === key ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}>{label}</button>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filters</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => handleStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => handleEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Method</label>
            <select
              value={methodFilter}
              onChange={e => handleMethodFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 dark:bg-slate-700 dark:text-white"
            >
              <option value="">All Methods</option>
              {Object.entries(SHIPPING_METHOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={e => handleTypeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 dark:bg-slate-700 dark:text-white"
            >
              <option value="">All Types</option>
              {Object.entries(SHIPMENT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      <div className="space-y-2">
        <BulkActions
          selectedIds={selectedIds}
          onClearSelection={clearSelection}
          onActionComplete={loadShipments}
        />
        {/* Print Labels bulk action */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl animate-in slide-in-from-bottom-2 duration-200">
            <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            <span className="text-sm font-medium text-emerald-800">{selectedIds.length} shipment{selectedIds.length !== 1 ? 's' : ''} selected for label printing</span>
            <button
              onClick={() => {
                setLabelShipmentIds(selectedIds);
                setCurrentPage('shipping-label');
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors ml-auto"
            >
              <PrintIcon className="w-3.5 h-3.5" /> Print Labels
            </button>
            <button
              onClick={clearSelection}
              className="text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3 mt-4">
            {shipments.map((s: any) => (
              <div key={s.id} className={`bg-white dark:bg-slate-800 rounded-xl border p-4 shadow-sm ${selectedIds.includes(s.id) ? 'border-emerald-400 ring-1 ring-emerald-400' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono text-sm font-medium text-slate-900 dark:text-white">{s.shipmentId}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{s.trackingNumber}</div>
                      </div>
                      <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${SHIPMENT_STATUS_COLORS[s.status]}`}>
                        {SHIPMENT_STATUS_LABELS[s.status]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3 ml-7">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{s.customer?.name || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <MapPinIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{s.destinationCity}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <PackageIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{s.weight} kg</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <DollarIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>${s.shipmentValue?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-7">
                  <select
                    onChange={e => e.target.value && updateStatus(s.id, e.target.value)}
                    className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 bg-white dark:bg-slate-700"
                    defaultValue=""
                  >
                    <option value="">Update Status</option>
                    {getNextStatuses(s.status).map(k => <option key={k} value={k}>{SHIPMENT_STATUS_LABELS[k]}</option>)}
                  </select>
                </div>
              </div>
            ))}
            {shipments.length === 0 && (
              <div className="text-center py-12 text-slate-400">No shipments found</div>
            )}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mt-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Destination</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Method</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Weight</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Value</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {shipments.map((s: any) => (
                    <tr key={s.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 ${selectedIds.includes(s.id) ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm text-slate-900 dark:text-white">{s.shipmentId}</div>
                        <div className="text-xs text-slate-400">{s.trackingNumber}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{s.customer?.name || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-700 dark:text-slate-300">{s.destinationCity}</div>
                        <div className="text-xs text-slate-400">{s.destinationCountry}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{SHIPPING_METHOD_LABELS[s.shippingMethod]}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{SHIPMENT_TYPE_LABELS[s.shipmentType]}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{s.weight} kg</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">${s.shipmentValue?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${SHIPMENT_STATUS_COLORS[s.status]}`}>
                          {SHIPMENT_STATUS_LABELS[s.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select onChange={e => e.target.value && updateStatus(s.id, e.target.value)} className="text-xs border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 bg-white dark:bg-slate-700" defaultValue="">
                          <option value="">Update Status</option>
                          {getNextStatuses(s.status).map(k => <option key={k} value={k}>{SHIPMENT_STATUS_LABELS[k]}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing <span className="font-medium text-slate-700 dark:text-slate-300">{startItem}</span> to <span className="font-medium text-slate-700 dark:text-slate-300">{endItem}</span> of <span className="font-medium text-slate-700 dark:text-slate-300">{total}</span> shipments
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (pages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pages - 2) {
                    pageNum = pages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${currentPage === pageNum ? 'bg-emerald-600 text-white' : 'border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={currentPage >= pages}
                  className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={loadShipments}
        />
      )}
    </div>
  );
}
