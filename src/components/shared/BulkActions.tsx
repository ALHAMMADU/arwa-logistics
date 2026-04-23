'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { SHIPMENT_STATUS_LABELS } from '@/lib/shipping';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export default function BulkActions({ selectedIds, onClearSelection, onActionComplete }: BulkActionsProps) {
  const [statusValue, setStatusValue] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | null>(null);
  const [loading, setLoading] = useState(false);

  if (selectedIds.length === 0) return null;

  const handleUpdateStatus = async () => {
    if (!statusValue) {
      toast.error('Please select a status');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/shipments/bulk', {
        method: 'POST',
        body: JSON.stringify({ action: 'updateStatus', shipmentIds: selectedIds, status: statusValue }),
      });
      if (res.success) {
        toast.success(`Updated ${res.data.updated} shipment(s)`);
        setShowStatusDropdown(false);
        setStatusValue('');
        onClearSelection();
        onActionComplete();
      } else {
        toast.error(res.error || 'Failed to update status');
      }
    } catch {
      toast.error('Network error');
    }
    setLoading(false);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('arwa_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/shipments/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'export', shipmentIds: selectedIds }),
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/csv')) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shipments-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success(`Exported ${selectedIds.length} shipment(s)`);
        onClearSelection();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Export failed');
      }
    } catch {
      toast.error('Network error');
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/shipments/bulk', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', shipmentIds: selectedIds }),
      });
      if (res.success) {
        toast.success(`Deleted ${res.data.updated} shipment(s)`);
        setConfirmAction(null);
        onClearSelection();
        onActionComplete();
      } else {
        toast.error(res.error || 'Failed to delete');
      }
    } catch {
      toast.error('Network error');
    }
    setLoading(false);
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl animate-in slide-in-from-bottom-2 duration-200">
        <span className="text-sm font-medium text-emerald-800">
          {selectedIds.length} selected
        </span>
        <div className="h-4 w-px bg-emerald-300" />

        {/* Update Status */}
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
          >
            Update Status
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[200px] max-h-64 overflow-y-auto">
              <div className="p-2">
                <select
                  value={statusValue}
                  onChange={e => setStatusValue(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  <option value="">Select status...</option>
                  {Object.entries(SHIPMENT_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <button
                  onClick={handleUpdateStatus}
                  disabled={!statusValue || loading}
                  className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          Export
        </button>

        {/* Delete */}
        <button
          onClick={() => setConfirmAction('delete')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
          Delete
        </button>

        <div className="h-4 w-px bg-emerald-300" />
        <button
          onClick={onClearSelection}
          className="text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmAction === 'delete'} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} shipment(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will soft-delete the selected shipments. They will be marked as inactive and hidden from views. This action can be undone by an admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
