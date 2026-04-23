'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { toast } from 'sonner';
import AutoRefresh from '@/components/shared/AutoRefresh';
import {
  SearchIcon,
  RefreshIcon,
  FilterIcon,
  FileDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  NetworkIcon,
  XIcon,
  ShieldIcon,
} from '@/components/icons';

// ─── Types ───────────────────────────────────────────────

interface AuditLogUser {
  name: string;
  email: string;
  role: string;
}

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: AuditLogUser | null;
}

// ─── Constants ───────────────────────────────────────────

const ACTION_TYPES = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'SCAN', 'STATUS_CHANGE'] as const;

const ENTITY_TYPES = [
  'ALL',
  'Shipment',
  'User',
  'Warehouse',
  'Route',
  'Country',
  'ShipmentPhoto',
  'ShippingMethod',
  'Invoice',
] as const;

const PAGE_SIZE = 20;

// ─── Action Badge Config ─────────────────────────────────

function getActionBadgeStyle(action: string): { bg: string; text: string; dot: string; darkBg: string; darkText: string } {
  switch (action) {
    case 'CREATE':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
        darkBg: 'dark:bg-emerald-950/50',
        darkText: 'dark:text-emerald-400',
      };
    case 'UPDATE':
      return {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        dot: 'bg-sky-500',
        darkBg: 'dark:bg-sky-950/50',
        darkText: 'dark:text-sky-400',
      };
    case 'DELETE':
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        dot: 'bg-red-500',
        darkBg: 'dark:bg-red-950/50',
        darkText: 'dark:text-red-400',
      };
    case 'SCAN':
      return {
        bg: 'bg-violet-50',
        text: 'text-violet-700',
        dot: 'bg-violet-500',
        darkBg: 'dark:bg-violet-950/50',
        darkText: 'dark:text-violet-400',
      };
    case 'STATUS_CHANGE':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
        darkBg: 'dark:bg-amber-950/50',
        darkText: 'dark:text-amber-400',
      };
    default:
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        dot: 'bg-slate-500',
        darkBg: 'dark:bg-slate-800',
        darkText: 'dark:text-slate-400',
      };
  }
}

// ─── Format Helpers ──────────────────────────────────────

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncateDetails(details: string | null, maxLen = 80): string {
  if (!details) return '-';
  try {
    const parsed = JSON.parse(details);
    const str = JSON.stringify(parsed, null, 0);
    return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
  } catch {
    return details.length > maxLen ? details.slice(0, maxLen) + '...' : details;
  }
}

function formatFullDetails(details: string | null): string {
  if (!details) return '-';
  try {
    const parsed = JSON.parse(details);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return details;
  }
}

// ─── Action Badge Component ──────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const style = getActionBadgeStyle(action);
  const labels: Record<string, string> = {
    CREATE: 'Create',
    UPDATE: 'Update',
    DELETE: 'Delete',
    SCAN: 'Scan',
    STATUS_CHANGE: 'Status',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text} ${style.darkBg} ${style.darkText}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {labels[action] || action}
    </span>
  );
}

// ─── Export CSV Helper ───────────────────────────────────

function exportToCSV(logs: AuditLog[], filename: string) {
  const headers = ['Timestamp', 'User Name', 'User Email', 'Action', 'Entity', 'Entity ID', 'Details', 'IP Address'];
  const rows = logs.map((log) => [
    `"${new Date(log.createdAt).toISOString()}"`,
    `"${log.user?.name || 'Unknown'}"`,
    `"${log.user?.email || '-'}"`,
    `"${log.action}"`,
    `"${log.entity}"`,
    `"${log.entityId || '-'}"`,
    `"${(log.details || '-').replace(/"/g, '""')}"`,
    `"${log.ipAddress || '-'}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Main Component ──────────────────────────────────────

export default function AdminAuditLogs() {
  // ── Filter State ──
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── Pagination State ──
  const [page, setPage] = useState(1);

  // ── Expanded Details State ──
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Last Updated ──
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ── Export Loading ──
  const [exporting, setExporting] = useState(false);

  // ── Fetch All Logs ──
  const { data: allLogs, loading, refresh } = useFetch<AuditLog[]>(
    () =>
      apiFetch('/admin/audit-logs?limit=500').then((r) => {
        if (r.success) {
          setLastUpdated(new Date());
          return r.data || [];
        }
        return [];
      }),
    []
  );

  // ── Client-Side Filtering ──
  const filteredLogs = useMemo(() => {
    if (!allLogs) return [];

    let result = [...allLogs];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (log) =>
          (log.user?.name || '').toLowerCase().includes(q) ||
          (log.user?.email || '').toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.entity.toLowerCase().includes(q) ||
          (log.details || '').toLowerCase().includes(q) ||
          (log.entityId || '').toLowerCase().includes(q)
      );
    }

    // Action filter
    if (actionFilter !== 'ALL') {
      result = result.filter((log) => log.action === actionFilter);
    }

    // Entity filter
    if (entityFilter !== 'ALL') {
      result = result.filter((log) => log.entity === entityFilter);
    }

    // Date from
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((log) => new Date(log.createdAt) >= from);
    }

    // Date to
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((log) => new Date(log.createdAt) <= to);
    }

    return result;
  }, [allLogs, search, actionFilter, entityFilter, dateFrom, dateTo]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  const totalFiltered = filteredLogs.length;

  // ── Handle Search ──
  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  // ── Clear Filters ──
  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setActionFilter('ALL');
    setEntityFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }, []);

  const hasActiveFilters = search || actionFilter !== 'ALL' || entityFilter !== 'ALL' || dateFrom || dateTo;

  // ── Handle Refresh ──
  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // ── Handle Export ──
  const handleExport = useCallback(() => {
    if (filteredLogs.length === 0) {
      toast.error('No logs to export');
      return;
    }
    setExporting(true);
    try {
      const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(filteredLogs, filename);
      toast.success(`Exported ${filteredLogs.length} log entries`);
    } catch {
      toast.error('Failed to export logs');
    } finally {
      setExporting(false);
    }
  }, [filteredLogs]);

  // ── Toggle Expanded Details ──
  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // ── Page Numbers ──
  const pageNumbers = useMemo(() => {
    const maxVisible = 5;
    const pages: number[] = [];
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i);
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Audit Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track all system activities and changes
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <AutoRefresh interval={30} onRefresh={handleRefresh} lastUpdated={lastUpdated} />
          <button
            onClick={handleExport}
            disabled={exporting || filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            ) : (
              <FileDownIcon className="w-4 h-4" />
            )}
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* ── Filters Card ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FilterIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filters</span>
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
              {[search && 1, actionFilter !== 'ALL' && 1, entityFilter !== 'ALL' && 1, dateFrom && 1, dateTo && 1].filter(Boolean).length}
            </span>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search user, action, entity, details..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Action Type Filter */}
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-w-[140px]"
          >
            {ACTION_TYPES.map((a) => (
              <option key={a} value={a}>
                {a === 'ALL' ? 'All Actions' : a}
              </option>
            ))}
          </select>

          {/* Entity Filter */}
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-w-[150px]"
          >
            {ENTITY_TYPES.map((e) => (
              <option key={e} value={e}>
                {e === 'ALL' ? 'All Entities' : e}
              </option>
            ))}
          </select>

          {/* Date From */}
          <div className="relative">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              placeholder="From"
              className="px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-w-[140px]"
            />
          </div>

          {/* Date To */}
          <div className="relative">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              placeholder="To"
              className="px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-w-[140px]"
            />
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors whitespace-nowrap"
          >
            Search
          </button>
        </div>

        {/* Active filters bar */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <span className="text-xs text-slate-400 dark:text-slate-500">Active:</span>
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                &quot;{search}&quot;
                <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="hover:text-red-500 transition-colors">
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            {actionFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {actionFilter}
                <button onClick={() => { setActionFilter('ALL'); setPage(1); }} className="hover:text-red-500 transition-colors">
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            {entityFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {entityFilter}
                <button onClick={() => { setEntityFilter('ALL'); setPage(1); }} className="hover:text-red-500 transition-colors">
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateFrom && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                From: {formatDateShort(dateFrom)}
                <button onClick={() => { setDateFrom(''); setPage(1); }} className="hover:text-red-500 transition-colors">
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateTo && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                To: {formatDateShort(dateTo)}
                <button onClick={() => { setDateTo(''); setPage(1); }} className="hover:text-red-500 transition-colors">
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Results count */}
        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {loading ? (
            'Loading logs...'
          ) : (
            <>
              Showing{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {pagedLogs.length}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {totalFiltered}
              </span>{' '}
              log entries
              {totalFiltered !== (allLogs?.length || 0) && (
                <span className="text-slate-400 dark:text-slate-500">
                  {' '}
                  (filtered from {allLogs?.length || 0} total)
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Loading State ── */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12">
          <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <RefreshIcon className="w-8 h-8 animate-spin mb-3 text-emerald-500" />
            <p className="text-sm font-medium">Loading audit logs...</p>
          </div>
        </div>
      ) : pagedLogs.length === 0 ? (
        /* ── Empty State ── */
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-16">
          <div className="text-center">
            <ShieldIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">No audit logs found</h3>
            <p className="text-slate-400 dark:text-slate-500 mt-2 text-sm">
              {hasActiveFilters
                ? 'Try adjusting your search or filters to find what you\'re looking for'
                : 'Audit logs will appear here as system activity occurs'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ── Mobile Card Layout ── */}
          <div className="md:hidden space-y-3">
            {pagedLogs.map((log) => {
              const isExpanded = expandedId === log.id;
              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden"
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                    onClick={() => toggleExpanded(log.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <ActionBadge action={log.action} />
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                        <ClockIcon className="w-3 h-3" />
                        {formatTimestamp(log.createdAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {log.entity}
                      </span>
                      {log.entityId && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                          #{log.entityId.slice(-8)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <UserIcon className="w-3 h-3" />
                      <span>{log.user?.name || 'Unknown'}</span>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <span>{log.user?.email || '-'}</span>
                    </div>

                    {/* Expand indicator */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {isExpanded ? 'Tap to collapse' : 'Tap for details'}
                      </span>
                      {isExpanded ? (
                        <ChevronUpIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-slate-400 dark:text-slate-500 block mb-0.5">Entity ID</span>
                          <span className="text-slate-700 dark:text-slate-300 font-mono text-xs break-all">
                            {log.entityId || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 dark:text-slate-500 block mb-0.5">IP Address</span>
                          <span className="text-slate-700 dark:text-slate-300 font-mono text-xs flex items-center gap-1">
                            <NetworkIcon className="w-3 h-3" />
                            {log.ipAddress || '-'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 block mb-1">Details</span>
                        <pre className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-lg p-2 overflow-x-auto max-h-40 border border-slate-200 dark:border-slate-700 whitespace-pre-wrap break-all">
                          {formatFullDetails(log.details)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Desktop Table Layout ── */}
          <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full">
                {/* Sticky Header */}
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5" />
                        Timestamp
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5" />
                        User
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[120px]">
                      Action
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[130px]">
                      Entity
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[110px]">
                      Entity ID
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[130px]">
                      <div className="flex items-center gap-1.5">
                        <NetworkIcon className="w-3.5 h-3.5" />
                        IP Address
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {pagedLogs.map((log, idx) => {
                    const isExpanded = expandedId === log.id;
                    const isEven = idx % 2 === 0;
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          className={`transition-colors cursor-pointer ${
                            isEven
                              ? 'bg-white dark:bg-slate-800'
                              : 'bg-slate-50/50 dark:bg-slate-800/50'
                          } hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20`}
                          onClick={() => toggleExpanded(log.id)}
                        >
                          {/* Timestamp */}
                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                              {formatTimestamp(log.createdAt)}
                            </div>
                          </td>

                          {/* User */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                                {(log.user?.name || '?')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                  {log.user?.name || 'Unknown'}
                                </div>
                                <div className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                  {log.user?.email || '-'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Action Badge */}
                          <td className="px-4 py-3">
                            <ActionBadge action={log.action} />
                          </td>

                          {/* Entity */}
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                              {log.entity}
                            </span>
                          </td>

                          {/* Entity ID */}
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400" title={log.entityId || undefined}>
                              {log.entityId ? `#${log.entityId.slice(-8)}` : '-'}
                            </span>
                          </td>

                          {/* Details (truncated with expand toggle) */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 max-w-xs">
                              <span className="text-xs text-slate-500 dark:text-slate-400 truncate" title={log.details || undefined}>
                                {truncateDetails(log.details)}
                              </span>
                              {log.details && log.details.length > 80 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpanded(log.id);
                                  }}
                                  className="shrink-0 p-0.5 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronUpIcon className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDownIcon className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* IP Address */}
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              {log.ipAddress || '-'}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50 dark:bg-slate-900/40">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="max-w-4xl space-y-3">
                                {/* Full details */}
                                <div>
                                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Full Details
                                  </span>
                                  <pre className="mt-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-lg p-3 overflow-x-auto max-h-60 border border-slate-200 dark:border-slate-700 whitespace-pre-wrap break-all">
                                    {formatFullDetails(log.details)}
                                  </pre>
                                </div>
                                {/* Metadata row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                      Log ID
                                    </span>
                                    <span className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                                      {log.id}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                      Full Entity ID
                                    </span>
                                    <span className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                                      {log.entityId || '-'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                      User Role
                                    </span>
                                    <span className="text-xs text-slate-600 dark:text-slate-400">
                                      {log.user?.role || '-'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                      IP Address
                                    </span>
                                    <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                      {log.ipAddress || '-'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Page{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{currentPage}</span>{' '}
                of{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{totalPages}</span>
                <span className="text-slate-400 dark:text-slate-500 ml-2">
                  ({totalFiltered} total entries)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Previous Button */}
                <button
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Page Numbers */}
                {pageNumbers.map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors font-medium ${
                      currentPage === pageNum
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                {/* Next Button */}
                <button
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
