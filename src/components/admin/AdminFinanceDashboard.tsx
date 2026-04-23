'use client';

import React, { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { toast } from 'sonner';
import {
  DollarIcon,
  TrendingUpIcon,
  CreditCardIcon,
  BarChartIcon,
  PlaneIcon,
  ShipIcon,
  TruckIcon,
  RefreshIcon,
  DownloadIcon,
  PrintIcon,
  ClockIcon,
  AlertIcon,
  GlobeIcon,
  UsersIcon,
  ChevronUpIcon,
  CalendarIcon,
  FilterIcon,
  ExportIcon,
} from '@/components/icons';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { SkeletonStats, SkeletonChart, SkeletonTable } from '@/components/shared/SkeletonLoaders';
import AutoRefresh from '@/components/shared/AutoRefresh';

// ─── Types ──────────────────────────────────────────────

type Period = 'month' | 'quarter' | 'year' | 'custom';

// ─── Color Palettes ──────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  AIR: '#0ea5e9',
  SEA: '#6366f1',
  LAND: '#f59e0b',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#22c55e',
  PENDING: '#f59e0b',
  PROCESSING: '#0ea5e9',
  FAILED: '#ef4444',
  REFUNDED: '#a855f7',
};

const ROUTE_PALETTE = [
  '#059669', '#0ea5e9', '#f59e0b', '#a855f7', '#f97316',
  '#14b8a6', '#6366f1', '#ef4444', '#84cc16', '#ec4899',
];

const AGING_COLORS: Record<string, string> = {
  '1-30 days': '#f59e0b',
  '31-60 days': '#f97316',
  '61-90 days': '#ef4444',
  '90+ days': '#991b1b',
};

// ─── Chart Configs ───────────────────────────────────────

const revenueChartConfig: ChartConfig = {
  revenue: { label: 'Revenue ($)', color: '#059669' },
};

const dailyRevenueConfig: ChartConfig = {
  revenue: { label: 'Revenue ($)', color: '#10b981' },
};

// ─── Helpers ────────────────────────────────────────────

function formatMonth(monthStr: string) {
  const [year, month] = monthStr.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatShortCurrency(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Custom Tooltips ────────────────────────────────────

function FinanceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color || '#059669' }}>
          {p.name}: {typeof p.value === 'number' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Change Indicator ──────────────────────────────────

function ChangeIndicator({ value, invertColor = false }: { value: number; invertColor?: boolean }) {
  if (value === 0) return <span className="text-xs text-slate-400">0%</span>;
  const isPositive = invertColor ? value < 0 : value > 0;
  return (
    <div className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      <ChevronUpIcon className={`w-3 h-3 ${!isPositive ? 'rotate-180' : ''}`} />
      <span>{Math.abs(value)}%</span>
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────

function PaymentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    COMPLETED: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
    PENDING: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
    PROCESSING: { bg: 'bg-sky-50 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400' },
    FAILED: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
    REFUNDED: { bg: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400' },
  };
  const c = config[status] || { bg: 'bg-slate-50 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-400' };
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${c.bg} ${c.text}`}>
      {status}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────

export default function AdminFinanceDashboard() {
  const [period, setPeriod] = useState<Period>('year');
  const [shippingMethod, setShippingMethod] = useState<string>('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);

  const buildUrl = useCallback(() => {
    let url = `/admin/finance?period=${period}`;
    if (period === 'custom' && customStart) url += `&startDate=${customStart}`;
    if (period === 'custom' && customEnd) url += `&endDate=${customEnd}`;
    if (shippingMethod) url += `&shippingMethod=${shippingMethod}`;
    return url;
  }, [period, shippingMethod, customStart, customEnd]);

  const { data, loading, refresh } = useFetch<any>(
    () => apiFetch(buildUrl()).then((r) => {
      if (r.success) { setLastUpdated(new Date()); return r.data; }
      toast.error(r.error || 'Failed to load financial data');
      return null;
    }),
    [period, shippingMethod, customStart, customEnd]
  );

  // ─── CSV Export ───
  const handleCsvExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('arwa_token');
      let url = `/admin/finance?period=${period}&format=csv`;
      if (period === 'custom' && customStart) url += `&startDate=${customStart}`;
      if (period === 'custom' && customEnd) url += `&endDate=${customEnd}`;
      if (shippingMethod) url += `&shippingMethod=${shippingMethod}`;

      // Build CSV from current data
      if (!data) { toast.error('No data to export'); setExporting(false); return; }

      const rows: string[][] = [];
      rows.push(['ARWA LOGISTICS - Financial Dashboard']);
      rows.push([]);
      rows.push(['Summary']);
      rows.push(['Total Revenue', data.totalRevenue]);
      rows.push(['Previous Period Revenue', data.previousRevenue]);
      rows.push(['Revenue Growth', `${data.revenueGrowth}%`]);
      rows.push(['Outstanding Payments', data.outstandingPayments?.amount]);
      rows.push(['Average Order Value', data.averageOrderValue]);
      rows.push([]);
      rows.push(['Revenue by Shipping Method']);
      rows.push(['Method', 'Revenue']);
      (data.revenueByMethod || []).forEach((m: any) => rows.push([m.method, m.revenue]));
      rows.push([]);
      rows.push(['Top Revenue Routes']);
      rows.push(['Route', 'Revenue', 'Shipments']);
      (data.topRoutes || []).forEach((r: any) => rows.push([r.route, r.revenue, r.shipmentCount]));
      rows.push([]);
      rows.push(['Monthly Revenue']);
      rows.push(['Month', 'Revenue']);
      (data.monthlyRevenue || []).forEach((m: any) => rows.push([m.month, m.revenue]));
      rows.push([]);
      rows.push(['Recent Payments']);
      rows.push(['Payment ID', 'Amount', 'Status', 'Customer', 'Method', 'Date']);
      (data.recentPayments || []).forEach((p: any) => rows.push([p.paymentId, p.amount, p.status, p.customer, p.method, p.createdAt]));
      rows.push([]);
      rows.push(['Aging Report']);
      rows.push(['Range', 'Count', 'Amount']);
      (data.agingReport?.buckets || []).forEach((b: any) => rows.push([b.range, b.count, b.amount]));

      const escape = (f: unknown) => {
        const s = String(f ?? '');
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csvContent = rows.map(r => r.map(escape).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `arwa-finance-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
      toast.success('CSV exported successfully');
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  // ─── PDF Export (print) ───
  const handlePdfExport = () => {
    if (!data) return;
    const reportTitle = 'ARWA LOGISTICS — Financial Report';
    const dateInfo = `Period: ${period === 'custom' ? `${customStart || 'Start'} to ${customEnd || 'Now'}` : period.charAt(0).toUpperCase() + period.slice(1)}`;

    const html = `<!DOCTYPE html><html><head><title>${reportTitle}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#1e293b}
      .header{border-bottom:3px solid #059669;padding-bottom:16px;margin-bottom:24px}.header h1{font-size:24px;color:#059669;margin-bottom:4px}.header p{font-size:13px;color:#64748b}
      h3{font-size:15px;color:#1e293b;margin:16px 0 8px}table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}
      th{background:#f1f5f9;text-align:left;padding:8px 10px;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0}
      td{padding:6px 10px;border-bottom:1px solid #f1f5f9}.footer{margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
      .stat{display:inline-block;margin-right:24px;margin-bottom:12px}.stat-label{font-size:11px;color:#64748b}.stat-value{font-size:20px;font-weight:700;color:#059669}
      @media print{body{padding:20px}}</style></head>
      <body><div class="header"><h1>${reportTitle}</h1><p>${dateInfo} — Generated: ${new Date().toLocaleDateString()}</p></div>
      <div><div class="stat"><div class="stat-label">Total Revenue</div><div class="stat-value">${formatCurrency(data.totalRevenue || 0)}</div></div>
      <div class="stat"><div class="stat-label">Outstanding</div><div class="stat-value">${formatCurrency(data.outstandingPayments?.amount || 0)}</div></div>
      <div class="stat"><div class="stat-label">Avg Order Value</div><div class="stat-value">${formatCurrency(data.averageOrderValue || 0)}</div></div>
      <div class="stat"><div class="stat-label">Growth</div><div class="stat-value">${data.revenueGrowth || 0}%</div></div></div>
      <h3>Revenue by Method</h3><table><tr><th>Method</th><th>Revenue</th></tr>${(data.revenueByMethod || []).map((m: any) => `<tr><td>${m.method}</td><td>${formatCurrency(m.revenue)}</td></tr>`).join('')}</table>
      <h3>Top Revenue Routes</h3><table><tr><th>Route</th><th>Revenue</th><th>Shipments</th></tr>${(data.topRoutes || []).map((r: any) => `<tr><td>${r.route}</td><td>${formatCurrency(r.revenue)}</td><td>${r.shipmentCount}</td></tr>`).join('')}</table>
      <h3>Monthly Revenue</h3><table><tr><th>Month</th><th>Revenue</th></tr>${(data.monthlyRevenue || []).map((m: any) => `<tr><td>${m.month}</td><td>${formatCurrency(m.revenue)}</td></tr>`).join('')}</table>
      <h3>Recent Payments</h3><table><tr><th>ID</th><th>Amount</th><th>Status</th><th>Customer</th><th>Date</th></tr>${(data.recentPayments || []).map((p: any) => `<tr><td>${p.paymentId}</td><td>${formatCurrency(p.amount)}</td><td>${p.status}</td><td>${p.customer}</td><td>${formatDate(p.createdAt)}</td></tr>`).join('')}</table>
      <h3>Aging Report</h3><table><tr><th>Range</th><th>Count</th><th>Amount</th></tr>${(data.agingReport?.buckets || []).map((b: any) => `<tr><td>${b.range}</td><td>${b.count}</td><td>${formatCurrency(b.amount)}</td></tr>`).join('')}</table>
      <div class="footer">ARWA LOGISTICS — Confidential Report — ${new Date().toLocaleString()}</div></body></html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.onload = () => setTimeout(() => w.print(), 500);
      toast.success('PDF export ready — use "Save as PDF" in print dialog');
    } else {
      toast.error('Please allow popups to export PDF');
    }
  };

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Finance Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Financial overview & reporting</p>
          </div>
        </div>
        <SkeletonStats count={5} />
        <div className="grid lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <SkeletonTable rows={5} columns={6} />
      </div>
    );
  }

  // ─── Prepare chart data ───

  // Revenue trend (monthly)
  const monthlyRevenueData = (data?.monthlyRevenue || []).map((m: any) => ({
    month: formatMonth(m.month),
    revenue: m.revenue,
  }));

  // Revenue by method (pie)
  const methodPieData = (data?.revenueByMethod || []).map((m: any) => ({
    name: m.method,
    value: m.revenue,
    fill: METHOD_COLORS[m.method] || '#94a3b8',
  }));

  const methodChartConfig: ChartConfig = { value: { label: 'Revenue' } };
  methodPieData.forEach((m: any) => {
    methodChartConfig[m.name] = { label: m.name, color: m.fill };
  });

  // Revenue by route (horizontal bar)
  const routeBarData = (data?.revenueByRoute || []).map((r: any, i: number) => ({
    route: r.route.length > 25 ? r.route.substring(0, 25) + '...' : r.route,
    revenue: r.revenue,
    fill: ROUTE_PALETTE[i % ROUTE_PALETTE.length],
  }));

  const routeChartConfig: ChartConfig = { revenue: { label: 'Revenue ($)', color: '#059669' } };

  // Payment status distribution (pie)
  const paymentStatusData = (data?.paymentStatusDistribution || []).map((s: any) => ({
    name: s.status,
    value: s.count,
    amount: s.amount,
    fill: PAYMENT_STATUS_COLORS[s.status] || '#94a3b8',
  }));

  const paymentChartConfig: ChartConfig = { value: { label: 'Payments' } };
  paymentStatusData.forEach((s: any) => {
    paymentChartConfig[s.name] = { label: s.name, color: s.fill };
  });

  // Daily revenue (bar chart)
  const dailyData = (data?.dailyRevenue || []).map((d: any) => ({
    date: formatDay(d.date),
    revenue: d.revenue,
  }));

  // Top customers
  const topCustomers = data?.topCustomers || [];

  // ─── Render ───

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Finance Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Financial overview & reporting for ARWA LOGISTICS</p>
        </div>
        <div className="flex items-center gap-3">
          <AutoRefresh interval={60} onRefresh={refresh} lastUpdated={lastUpdated} />
          <button
            onClick={handleCsvExport}
            disabled={exporting || !data}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <DownloadIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'CSV'}</span>
          </button>
          <button
            onClick={handlePdfExport}
            disabled={!data}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <PrintIcon className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <CalendarIcon className="w-4 h-4" />
          <span className="font-medium">Period:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['month', 'quarter', 'year', 'custom'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                period === p
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {p === 'month' ? 'This Month' : p === 'quarter' ? 'This Quarter' : p === 'year' ? 'This Year' : 'Custom'}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <FilterIcon className="w-4 h-4" />
          <span className="font-medium">Method:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {['', 'AIR', 'SEA', 'LAND'].map((m) => (
            <button
              key={m || 'all'}
              onClick={() => setShippingMethod(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                shippingMethod === m
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {m || 'All'}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <div className="flex items-center justify-center py-20 text-slate-400 dark:text-slate-500">
          <div className="text-center">
            <DollarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No financial data available</p>
            <p className="text-sm mt-1">Try adjusting the filters or refresh the page</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Top Stats Row ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Total Revenue */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:shadow-lg dark:hover:shadow-slate-900/50 transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
                  <DollarIcon className="w-4 h-4 text-white" />
                </div>
                <ChangeIndicator value={data.revenueGrowth || 0} />
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatShortCurrency(data.totalRevenue || 0)}</div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Revenue</span>
            </div>

            {/* Outstanding Payments */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:shadow-lg dark:hover:shadow-slate-900/50 transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg p-2 bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm">
                  <ClockIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{data.outstandingPayments?.count || 0} invoices</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatShortCurrency(data.outstandingPayments?.amount || 0)}</div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Outstanding Payments</span>
            </div>

            {/* Average Order Value */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:shadow-lg dark:hover:shadow-slate-900/50 transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-500" />
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg p-2 bg-gradient-to-br from-sky-500 to-cyan-500 shadow-sm">
                  <TrendingUpIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatShortCurrency(data.averageOrderValue || 0)}</div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Avg Order Value</span>
            </div>

            {/* Revenue by Method breakdown */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:shadow-lg dark:hover:shadow-slate-900/50 transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
              <div className="flex items-center justify-between mb-2">
                <div className="rounded-lg p-2 bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                  <CreditCardIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                {(data.revenueByMethod || []).map((m: any) => (
                  <div key={m.method} className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: METHOD_COLORS[m.method] || '#94a3b8' }} />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{m.method}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{formatShortCurrency(m.revenue)}</span>
                  </div>
                ))}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Revenue by Method</span>
            </div>

            {/* Month-over-Month Growth */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:shadow-lg dark:hover:shadow-slate-900/50 transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg p-2 bg-gradient-to-br from-teal-500 to-emerald-500 shadow-sm">
                  <BarChartIcon className="w-4 h-4 text-white" />
                </div>
                <ChangeIndicator value={data.revenueGrowth || 0} />
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{data.revenueGrowth || 0}%</div>
              <span className="text-xs text-slate-500 dark:text-slate-400">MoM Revenue Growth</span>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                vs {formatShortCurrency(data.previousRevenue || 0)} prev period
              </div>
            </div>
          </div>

          {/* ── Charts Row 1: Revenue Trend + Revenue by Method ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Revenue Trend - Area Chart */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUpIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Revenue Trend</h3>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Monthly revenue for the last 12 months</p>
              {monthlyRevenueData.length > 0 ? (
                <ChartContainer config={revenueChartConfig} className="h-[280px] w-full">
                  <AreaChart data={monthlyRevenueData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="financeRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => formatShortCurrency(v)}
                    />
                    <Tooltip content={<FinanceTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#059669"
                      strokeWidth={2}
                      fill="url(#financeRevenueGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-slate-400 dark:text-slate-500 text-sm">No revenue data available</div>
              )}
            </div>

            {/* Revenue by Shipping Method - Donut Chart */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShipIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Revenue by Shipping Method</h3>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Revenue breakdown by AIR, SEA, and LAND</p>
              {methodPieData.length > 0 ? (
                <div className="flex flex-col lg:flex-row items-center gap-4">
                  <ChartContainer config={methodChartConfig} className="h-[240px] w-full max-w-[240px]">
                    <PieChart>
                      <Pie
                        data={methodPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                      >
                        {methodPieData.map((entry: any, index: number) => (
                          <Cell key={`cell-method-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    </PieChart>
                  </ChartContainer>
                  <div className="flex-1 space-y-3 w-full">
                    {methodPieData.map((m: any) => {
                      const total = methodPieData.reduce((a: number, b: any) => a + b.value, 0);
                      const percentage = total > 0 ? Math.round((m.value / total) * 100) : 0;
                      return (
                        <div key={m.name} className="space-y-1.5">
                          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${m.fill}15` }}
                            >
                              {m.name === 'AIR' ? (
                                <PlaneIcon className="w-5 h-5" />
                              ) : m.name === 'SEA' ? (
                                <ShipIcon className="w-5 h-5" />
                              ) : (
                                <TruckIcon className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{m.name}</div>
                              <div className="text-xs text-slate-400 dark:text-slate-500">{formatCurrency(m.value)}</div>
                            </div>
                            <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{percentage}%</div>
                          </div>
                          <div className="mx-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: m.fill }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[240px] text-slate-400 dark:text-slate-500 text-sm">No method data available</div>
              )}
            </div>
          </div>

          {/* ── Charts Row 2: Revenue by Route + Payment Status ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Revenue by Route - Horizontal Bar Chart */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <GlobeIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Revenue by Route</h3>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Top 10 routes by revenue</p>
              {routeBarData.length > 0 ? (
                <ChartContainer config={routeChartConfig} className="h-[320px] w-full">
                  <BarChart data={routeBarData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} className="dark:opacity-20" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => formatShortCurrency(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="route"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      tickLine={false}
                      axisLine={false}
                      width={130}
                    />
                    <Tooltip content={<FinanceTooltip />} />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={24}>
                      {routeBarData.map((entry: any, index: number) => (
                        <Cell key={`cell-route-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[320px] text-slate-400 dark:text-slate-500 text-sm">No route data available</div>
              )}
            </div>

            {/* Payment Status Distribution - Pie Chart */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCardIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Payment Status Distribution</h3>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Breakdown of all payments by status</p>
              {paymentStatusData.length > 0 ? (
                <div className="flex flex-col lg:flex-row items-center gap-4">
                  <ChartContainer config={paymentChartConfig} className="h-[240px] w-full max-w-[240px]">
                    <PieChart>
                      <Pie
                        data={paymentStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                      >
                        {paymentStatusData.map((entry: any, index: number) => (
                          <Cell key={`cell-status-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    </PieChart>
                  </ChartContainer>
                  <div className="flex-1 space-y-1.5 max-h-[240px] overflow-y-auto w-full pr-1 custom-scrollbar">
                    {paymentStatusData.map((s: any) => (
                      <div key={s.name} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-400">{s.value}</span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(s.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[240px] text-slate-400 dark:text-slate-500 text-sm">No payment data available</div>
              )}
            </div>
          </div>

          {/* ── Charts Row 3: Daily Revenue + Customer Lifetime Value ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Daily Revenue - Bar Chart */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChartIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Daily Revenue</h3>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Last 30 days revenue</p>
              {dailyData.length > 0 && dailyData.some((d: any) => d.revenue > 0) ? (
                <ChartContainer config={dailyRevenueConfig} className="h-[280px] w-full">
                  <BarChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-20" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => formatShortCurrency(v)}
                    />
                    <Tooltip content={<FinanceTooltip />} />
                    <Bar
                      dataKey="revenue"
                      fill="#10b981"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={16}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-slate-400 dark:text-slate-500 text-sm">No daily revenue data</div>
              )}
            </div>

            {/* Customer Lifetime Value - Top 10 */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <UsersIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Customer Lifetime Value</h3>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Top 10 customers by total spending</p>
              {topCustomers.length > 0 ? (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {topCustomers.map((c: any, i: number) => {
                    const maxSpent = topCustomers[0]?.totalSpent || 1;
                    const barWidth = Math.max(5, (c.totalSpent / maxSpent) * 100);
                    return (
                      <div key={c.name + i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{c.name}</span>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">{formatCurrency(c.totalSpent)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {c.company || c.email} &middot; {c.paymentCount} payments
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-slate-400 dark:text-slate-500 text-sm">No customer data available</div>
              )}
            </div>
          </div>

          {/* ── Tables Section ── */}
          {/* Recent Payments Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <CreditCardIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recent Payments</h3>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">Latest 10 payments</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Destination</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Method</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {(data.recentPayments || []).map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900 dark:text-slate-100">{p.paymentId}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        <div>{p.customer}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{p.customerEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hidden md:table-cell">{p.destination}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          {p.shippingMethod === 'AIR' ? (
                            <PlaneIcon className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                          ) : p.shippingMethod === 'SEA' ? (
                            <ShipIcon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                          ) : (
                            <TruckIcon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                          )}
                          <span className="text-xs text-slate-600 dark:text-slate-400">{p.method}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><PaymentStatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 text-right">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-500 text-right hidden sm:table-cell">{formatDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(!data.recentPayments || data.recentPayments.length === 0) && (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">No payments found</div>
            )}
          </div>

          {/* Bottom Row: Top Revenue Routes Table + Aging Report */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top Revenue Routes Table */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="p-6 pb-4">
                <div className="flex items-center gap-2">
                  <GlobeIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Top Revenue Routes</h3>
                </div>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Route</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Revenue</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Shipments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {(data.topRoutes || []).map((r: any, i: number) => (
                      <tr key={r.route + i} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-slate-400 dark:text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{r.route}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-right">{formatCurrency(r.revenue)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 text-right">{r.shipmentCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(!data.topRoutes || data.topRoutes.length === 0) && (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">No route data available</div>
              )}
            </div>

            {/* Aging Report */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
              <div className="p-6 pb-4">
                <div className="flex items-center gap-2">
                  <AlertIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Aging Report</h3>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Overdue payments breakdown</p>
              </div>

              {/* Aging Buckets */}
              <div className="px-6 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(data.agingReport?.buckets || []).map((b: any) => (
                    <div key={b.range} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{b.range}</div>
                      <div className="text-lg font-bold" style={{ color: AGING_COLORS[b.range] || '#059669' }}>{b.count}</div>
                      <div className="text-xs text-slate-400">{formatCurrency(b.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overdue Payments List */}
              {(data.agingReport?.overduePayments || []).length > 0 ? (
                <div className="overflow-x-auto max-h-64 overflow-y-auto border-t border-slate-200 dark:border-slate-700">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {(data.agingReport?.overduePayments || []).slice(0, 20).map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-2 text-xs font-mono text-slate-700 dark:text-slate-300">{p.paymentId}</td>
                          <td className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400">{p.customer}</td>
                          <td className="px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 text-right">{formatCurrency(p.amount)}</td>
                          <td className="px-4 py-2 text-right">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                              p.daysOverdue > 90 ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                              p.daysOverdue > 60 ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                              'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            }`}>
                              {p.daysOverdue}d
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-emerald-600 dark:text-emerald-400 text-sm border-t border-slate-200 dark:border-slate-700">
                  ✓ No overdue payments
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
