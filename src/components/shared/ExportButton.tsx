'use client';

import React, { useState } from 'react';
import { ExportIcon } from '@/components/icons';
import { toast } from 'sonner';

export default function ExportButton({ className = '' }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('arwa_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/export', { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Export failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shipments-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('CSV exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export CSV');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      ) : (
        <ExportIcon className="w-4 h-4" />
      )}
      {loading ? 'Exporting...' : 'Export CSV'}
    </button>
  );
}
