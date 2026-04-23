'use client';

import React, { useState, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { toast } from 'sonner';
import {
  FileTextIcon,
  PackageIcon,
  DollarIcon,
  UsersIcon,
  ExportIcon,
  PrintIcon,
  RefreshIcon,
  BarChartIcon,
  TrendingUpIcon,
  GlobeIcon,
  MapPinIcon,
  DownloadIcon,
  ShipIcon,
  PlaneIcon,
  TruckIcon,
} from '@/components/icons';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { SkeletonStats, SkeletonChart } from '@/components/shared/SkeletonLoaders';

// ─── Types ──────────────────────────────────────────────

type ReportType = 'summary' | 'shipments' | 'revenue' | 'customers';

interface TabConfig {
  key: ReportType;
  label: string;
  icon: React.ReactNode;
}

// ─── Color Palettes ──────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  CREATED: '#3b82f6',
  WAITING_WAREHOUSE_ARRIVAL: '#eab308',
  RECEIVED_AT_WAREHOUSE: '#f97316',
  PROCESSING: '#a855f7',
  READY_FOR_DISPATCH: '#6366f1',
  DISPATCHED: '#06b6d4',
  IN_TRANSIT: '#14b8a6',
  ARRIVED_AT_DESTINATION: '#059669',
  CUSTOMS_CLEARANCE: '#f59e0b',
  OUT_FOR_DELIVERY: '#84cc16',
  DELIVERED: '#22c55e',
};

const METHOD_COLORS: Record<string, string> = {
  AIR: '#0ea5e9',
  SEA: '#6366f1',
  LAND: '#f59e0b',
};

const PALETTE = [
  '#059669', '#0ea5e9', '#f59e0b', '#a855f7', '#f97316',
  '#14b8a6', '#6366f1', '#ef4444', '#84cc16', '#ec4899',
];

// ─── Chart Configs ──────────────────────────────────────

const shipmentsChartConfig: ChartConfig = {
  shipments: { label: 'Shipments', color: '#10b981' },
};
const revenueChartConfig: ChartConfig = {
  revenue: { label: 'Revenue ($)', color: '#059669' },
};
const avgValueChartConfig: ChartConfig = {
  averageValue: { label: 'Avg Value ($)', color: '#0ea5e9' },
};
const newCustomersChartConfig: ChartConfig = {
  newCustomers: { label: 'New Customers', color: '#10b981' },
};
const totalCustomersChartConfig: ChartConfig = {
  totalCustomers: { label: 'Total Customers', color: '#0ea5e9' },
};
const deliveredChartConfig: ChartConfig = {
  delivered: { label: 'Delivered', color: '#059669' },
};

// ─── Tab Configs ────────────────────────────────────────

const TABS: TabConfig[] = [
  { key: 'summary', label: 'Summary', icon: <BarChartIcon className="w-4 h-4" /> },
  { key: 'shipments', label: 'Shipments', icon: <PackageIcon className="w-4 h-4" /> },
  { key: 'revenue', label: 'Revenue', icon: <DollarIcon className="w-4 h-4" /> },
  { key: 'customers', label: 'Customers', icon: <UsersIcon className="w-4 h-4" /> },
];

// ─── Helpers ────────────────────────────────────────────

function formatMonth(monthStr: string) {
  const [year, month] = monthStr.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Custom Tooltip ─────────────────────────────────────

function ReportTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('revenue')
            ? formatCurrency(p.value)
            : p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState<ReportType>('summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const chartRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const buildUrl = useCallback(() => {
    let url = `/admin/reports?type=${activeTab}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return url;
  }, [activeTab, startDate, endDate]);

  const { data, loading, refresh } = useFetch<any>(
    () => apiFetch(buildUrl()).then((r) => {
      if (r.success) return r.data;
      toast.error(r.error || 'Failed to load report');
      return null;
    }),
    [activeTab, startDate, endDate]
  );

  // ── CSV Export ──
  const handleCsvExport = async () => {
    setExporting(true);
    try {
      let url = `/admin/reports?type=${activeTab}&format=csv`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const token = localStorage.getItem('arwa_token');
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `arwa-${activeTab}-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('CSV exported successfully');
    } catch (err: any) {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  // ── PDF Export (print-friendly window) ──
  const handlePdfExport = () => {
    // Collect chart images from refs
    const chartImages: { id: string; dataUrl: string }[] = [];
    chartRefs.current.forEach((el, id) => {
      const canvas = el.querySelector('canvas');
      if (canvas) {
        chartImages.push({ id, dataUrl: canvas.toDataURL('image/png') });
      }
    });

    const reportTitle = `ARWA LOGISTICS — ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report`;
    const dateInfo = startDate || endDate
      ? `Period: ${startDate || 'Start'} to ${endDate || 'Now'}`
      : `Generated: ${new Date().toLocaleDateString()}`;

    // Build HTML content based on report type
    let tableHtml = '';

    if (activeTab === 'summary' && data) {
      tableHtml = `
        <h3 style="margin-top:24px;">Overview</h3>
        <table><tr><td>Total Shipments</td><td><strong>${data.totalShipments}</strong></td></tr>
        <tr><td>Total Revenue</td><td><strong>${formatCurrency(data.revenue?.total || 0)}</strong></td></tr>
        <tr><td>Avg per Shipment</td><td><strong>${formatCurrency(data.revenue?.averagePerShipment || 0)}</strong></td></tr></table>

        <h3>Shipments by Status</h3>
        <table><tr><th>Status</th><th>Count</th></tr>
        ${(data.shipmentsByStatus || []).map((s: any) => `<tr><td>${s.status}</td><td>${s.count}</td></tr>`).join('')}</table>

        <h3>Shipments by Method</h3>
        <table><tr><th>Method</th><th>Count</th></tr>
        ${(data.shipmentsByMethod || []).map((m: any) => `<tr><td>${m.method}</td><td>${m.count}</td></tr>`).join('')}</table>

        <h3>Top 5 Destinations</h3>
        <table><tr><th>Country</th><th>Shipments</th></tr>
        ${(data.topDestinationCountries || []).map((c: any) => `<tr><td>${c.country}</td><td>${c.count}</td></tr>`).join('')}</table>

        <h3>Monthly Trends</h3>
        <table><tr><th>Month</th><th>Shipments</th><th>Revenue</th><th>Delivered</th></tr>
        ${(data.monthlyTrends || []).map((m: any) => `<tr><td>${m.month}</td><td>${m.shipments}</td><td>${formatCurrency(m.revenue)}</td><td>${m.delivered}</td></tr>`).join('')}</table>

        <h3>Warehouse Utilization</h3>
        <table><tr><th>Warehouse</th><th>City</th><th>Active</th><th>Capacity</th><th>Util %</th></tr>
        ${(data.warehouseUtilization || []).map((w: any) => `<tr><td>${w.name}</td><td>${w.city}</td><td>${w.activeShipments}</td><td>${w.capacity}</td><td>${w.utilizationPercent}%</td></tr>`).join('')}</table>
      `;
    } else if (activeTab === 'shipments' && data) {
      const shipments = Array.isArray(data) ? data : data.data || [];
      tableHtml = `
        <h3>Shipments (${shipments.length} records)</h3>
        <table style="font-size:10px;"><tr><th>ID</th><th>Customer</th><th>Destination</th><th>Method</th><th>Status</th><th>Value</th></tr>
        ${shipments.slice(0, 100).map((s: any) => `<tr><td>${s.shipmentId}</td><td>${s.customerName}</td><td>${s.destinationCity}, ${s.destinationCountry}</td><td>${s.shippingMethod}</td><td>${s.status}</td><td>${formatCurrency(s.shipmentValue)}</td></tr>`).join('')}</table>
      `;
    } else if (activeTab === 'revenue' && data) {
      tableHtml = `
        <h3>Overview</h3>
        <table><tr><td>Total Revenue</td><td><strong>${formatCurrency(data.totalRevenue || 0)}</strong></td></tr>
        <tr><td>Total Shipments</td><td><strong>${data.totalShipments || 0}</strong></td></tr></table>

        <h3>Revenue by Month</h3>
        <table><tr><th>Month</th><th>Revenue</th><th>Shipments</th><th>Avg Value</th></tr>
        ${(data.revenueByMonth || []).map((m: any) => `<tr><td>${m.month}</td><td>${formatCurrency(m.revenue)}</td><td>${m.shipmentCount}</td><td>${formatCurrency(m.averageValue)}</td></tr>`).join('')}</table>

        <h3>Revenue by Route</h3>
        <table><tr><th>Route</th><th>Revenue</th><th>Shipments</th></tr>
        ${(data.revenueByRoute || []).map((r: any) => `<tr><td>${r.route}</td><td>${formatCurrency(r.revenue)}</td><td>${r.shipmentCount}</td></tr>`).join('')}</table>

        <h3>Revenue by Method</h3>
        <table><tr><th>Method</th><th>Revenue</th><th>Shipments</th><th>Avg Value</th></tr>
        ${(data.revenueByMethod || []).map((m: any) => `<tr><td>${m.method}</td><td>${formatCurrency(m.revenue)}</td><td>${m.shipmentCount}</td><td>${formatCurrency(m.averageValue)}</td></tr>`).join('')}</table>
      `;
    } else if (activeTab === 'customers' && data) {
      tableHtml = `
        <h3>Overview</h3>
        <table><tr><td>Total Customers</td><td><strong>${data.totalCustomers || 0}</strong></td></tr></table>

        <h3>Top Customers by Count</h3>
        <table><tr><th>Name</th><th>Email</th><th>Company</th><th>Shipments</th></tr>
        ${(data.topCustomersByCount || []).map((c: any) => `<tr><td>${c.name}</td><td>${c.email}</td><td>${c.company || '-'}</td><td>${c.shipmentCount}</td></tr>`).join('')}</table>

        <h3>Top Customers by Value</h3>
        <table><tr><th>Name</th><th>Email</th><th>Company</th><th>Total Value</th><th>Shipments</th></tr>
        ${(data.topCustomersByValue || []).map((c: any) => `<tr><td>${c.name}</td><td>${c.email}</td><td>${c.company || '-'}</td><td>${formatCurrency(c.totalValue)}</td><td>${c.shipmentCount}</td></tr>`).join('')}</table>

        <h3>Customer Growth</h3>
        <table><tr><th>Month</th><th>New</th><th>Total</th></tr>
        ${(data.customerGrowth || []).map((m: any) => `<tr><td>${m.month}</td><td>${m.newCustomers}</td><td>${m.totalCustomers}</td></tr>`).join('')}</table>
      `;
    }

    // Build chart images HTML
    const chartsHtml = chartImages.map((img) =>
      `<div style="page-break-inside:avoid; margin:16px 0;"><img src="${img.dataUrl}" style="max-width:100%; height:auto;" /></div>`
    ).join('');

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
          .header { border-bottom: 3px solid #059669; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { font-size: 24px; color: #059669; margin-bottom: 4px; }
          .header p { font-size: 13px; color: #64748b; }
          h3 { font-size: 15px; color: #1e293b; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
          th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
          td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
          tr:hover { background: #f8fafc; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportTitle}</h1>
          <p>${dateInfo}</p>
        </div>
        ${chartsHtml}
        ${tableHtml}
        <div class="footer">ARWA LOGISTICS — Confidential Report — ${new Date().toLocaleString()}</div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 500);
      };
      toast.success('PDF export ready — use "Save as PDF" in the print dialog');
    } else {
      toast.error('Please allow popups to export PDF');
    }
  };

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Generate and export comprehensive business reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refresh()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleCsvExport}
            disabled={exporting || !data}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <DownloadIcon className="w-4 h-4" />
            <span>{exporting ? 'Exporting...' : 'CSV'}</span>
          </button>
          <button
            onClick={handlePdfExport}
            disabled={!data}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <PrintIcon className="w-4 h-4" />
            <span>PDF Export</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-600'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 dark:text-slate-400">From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 dark:text-slate-400">To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-6">
          <SkeletonStats count={4} />
          <div className="grid lg:grid-cols-2 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </div>
      )}

      {/* Report Content */}
      {!loading && data && (
        <div className="space-y-6">
          {activeTab === 'summary' && <SummaryReport data={data} chartRefs={chartRefs} />}
          {activeTab === 'shipments' && <ShipmentsReport data={data} />}
          {activeTab === 'revenue' && <RevenueReport data={data} chartRefs={chartRefs} />}
          {activeTab === 'customers' && <CustomersReport data={data} chartRefs={chartRefs} />}
        </div>
      )}

      {!loading && !data && (
        <div className="flex items-center justify-center py-20 text-slate-400 dark:text-slate-500">
          <div className="text-center">
            <FileTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No report data available</p>
            <p className="text-sm mt-1">Try adjusting the date range or refresh the page</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Summary Report ────────────────────────────────────

function SummaryReport({ data, chartRefs }: { data: any; chartRefs: React.RefObject<Map<string, HTMLDivElement>> }) {
  // Prepare chart data
  const monthlyData = (data.monthlyTrends || []).map((m: any) => ({
    month: formatMonth(m.month),
    shipments: m.shipments,
    revenue: m.revenue,
    delivered: m.delivered,
  }));

  const statusData = (data.shipmentsByStatus || []).map((s: any, i: number) => ({
    name: s.status.replace(/_/g, ' '),
    value: s.count,
    fill: STATUS_COLORS[s.status] || PALETTE[i % PALETTE.length],
  }));

  const methodData = (data.shipmentsByMethod || []).map((m: any) => ({
    name: m.method,
    value: m.count,
    fill: METHOD_COLORS[m.method] || PALETTE[0],
  }));

  const countryData = (data.topDestinationCountries || []).map((c: any, i: number) => ({
    country: c.country,
    count: c.count,
    fill: PALETTE[i % PALETTE.length],
  }));

  // Chart configs
  const statusChartConfig: ChartConfig = { value: { label: 'Shipments' } };
  statusData.forEach((s: any) => {
    statusChartConfig[s.name] = { label: s.name, color: s.fill };
  });
  const methodChartConfig: ChartConfig = { value: { label: 'Shipments' } };
  methodData.forEach((m: any) => {
    methodChartConfig[m.name] = { label: m.name, color: m.fill };
  });

  return (
    <>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Shipments"
          value={data.totalShipments?.toLocaleString() || '0'}
          icon={<PackageIcon className="w-5 h-5 text-emerald-600" />}
          bgAccent="bg-emerald-50 dark:bg-emerald-900/30"
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(data.revenue?.total || 0)}
          icon={<DollarIcon className="w-5 h-5 text-sky-600" />}
          bgAccent="bg-sky-50 dark:bg-sky-900/30"
        />
        <StatCard
          label="Avg per Shipment"
          value={formatCurrency(data.revenue?.averagePerShipment || 0)}
          icon={<TrendingUpIcon className="w-5 h-5 text-amber-600" />}
          bgAccent="bg-amber-50 dark:bg-amber-900/30"
        />
        <StatCard
          label="Top Destination"
          value={data.topDestinationCountries?.[0]?.country || 'N/A'}
          icon={<GlobeIcon className="w-5 h-5 text-violet-600" />}
          bgAccent="bg-violet-50 dark:bg-violet-900/30"
        />
      </div>

      {/* Charts Row 1: Monthly Trends */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div
          ref={(el) => { if (el) chartRefs.current?.set('summary-shipments-trend', el); }}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUpIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Monthly Shipment Trends</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">Last 12 months shipment volume and deliveries</p>
          <ChartContainer config={shipmentsChartConfig} className="h-[280px] w-full">
            <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="summaryShipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ReportTooltip />} />
              <Area type="monotone" dataKey="shipments" stroke="#10b981" strokeWidth={2} fill="url(#summaryShipGrad)" dot={false} activeDot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="delivered" stroke="#0ea5e9" strokeWidth={2} fill="transparent" strokeDasharray="5 5" dot={false} />
            </AreaChart>
          </ChartContainer>
        </div>

        <div
          ref={(el) => { if (el) chartRefs.current?.set('summary-revenue-trend', el); }}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <DollarIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Monthly Revenue</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">Revenue trends over the last 12 months</p>
          <ChartContainer config={revenueChartConfig} className="h-[280px] w-full">
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ReportTooltip />} />
              <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      {/* Charts Row 2: Status + Method Pie Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div
          ref={(el) => { if (el) chartRefs.current?.set('summary-status-pie', el); }}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChartIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Status Distribution</h3>
          </div>
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <ChartContainer config={statusChartConfig} className="h-[240px] w-full max-w-[240px]">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="value" nameKey="name" stroke="none">
                  {statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-s-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
              </PieChart>
            </ChartContainer>
            <div className="flex-1 space-y-1.5 max-h-[240px] overflow-y-auto w-full pr-1">
              {statusData.map((s: any) => (
                <div key={s.name} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                    <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{s.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          ref={(el) => { if (el) chartRefs.current?.set('summary-method-pie', el); }}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShipIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Shipping Method Distribution</h3>
          </div>
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <ChartContainer config={methodChartConfig} className="h-[240px] w-full max-w-[240px]">
              <PieChart>
                <Pie data={methodData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value" nameKey="name" stroke="none">
                  {methodData.map((entry: any, index: number) => (
                    <Cell key={`cell-m-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
              </PieChart>
            </ChartContainer>
            <div className="flex-1 space-y-2 w-full">
              {methodData.map((m: any) => (
                <div key={m.name} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${m.fill}15` }}>
                    {m.name === 'AIR' ? <PlaneIcon className="w-5 h-5" /> :
                     m.name === 'SEA' ? <ShipIcon className="w-5 h-5" /> :
                     <TruckIcon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{m.name}</div>
                    <div className="text-xs text-slate-400">{m.value} shipments</div>
                  </div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {methodData.reduce((a: number, b: any) => a + b.value, 0) > 0
                      ? Math.round((m.value / methodData.reduce((a: number, b: any) => a + b.value, 0)) * 100)
                      : 0}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Destinations */}
      {countryData.length > 0 && (
        <div
          ref={(el) => { if (el) chartRefs.current?.set('summary-countries', el); }}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <GlobeIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Top Destination Countries</h3>
          </div>
          <ChartContainer config={{ count: { label: 'Shipments', color: '#059669' } }} className="h-[260px] w-full">
            <BarChart data={countryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="country" tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} axisLine={false} width={120} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={24}>
                {countryData.map((entry: any, index: number) => (
                  <Cell key={`cell-c-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      )}

      {/* Warehouse Utilization */}
      {data.warehouseUtilization?.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPinIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Warehouse Utilization</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Warehouse</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">City</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Shipments</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Capacity</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.warehouseUtilization.map((w: any) => (
                  <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-3 py-3 text-sm font-medium text-slate-900 dark:text-white">{w.name}</td>
                    <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">{w.city}</td>
                    <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">{w.activeShipments}</td>
                    <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">{w.capacity}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(w.utilizationPercent, 100)}%`,
                              backgroundColor: w.utilizationPercent > 80 ? '#ef4444' : w.utilizationPercent > 50 ? '#f59e0b' : '#10b981',
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{w.utilizationPercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Shipments Report ──────────────────────────────────

function ShipmentsReport({ data }: { data: any }) {
  const shipments = Array.isArray(data) ? data : data?.data || [];
  const total = data?.total || shipments.length;

  // Summary stats
  const totalValue = shipments.reduce((sum: number, s: any) => sum + s.shipmentValue, 0);
  const totalWeight = shipments.reduce((sum: number, s: any) => sum + s.weight, 0);

  // Status breakdown
  const statusMap = new Map<string, number>();
  shipments.forEach((s: any) => {
    statusMap.set(s.status, (statusMap.get(s.status) || 0) + 1);
  });
  const statusBreakdown = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Method breakdown
  const methodMap = new Map<string, number>();
  shipments.forEach((s: any) => {
    methodMap.set(s.shippingMethod, (methodMap.get(s.shippingMethod) || 0) + 1);
  });
  const methodBreakdown = Array.from(methodMap.entries())
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Shipments"
          value={total.toLocaleString()}
          icon={<PackageIcon className="w-5 h-5 text-emerald-600" />}
          bgAccent="bg-emerald-50 dark:bg-emerald-900/30"
        />
        <StatCard
          label="Total Value"
          value={formatCurrency(totalValue)}
          icon={<DollarIcon className="w-5 h-5 text-sky-600" />}
          bgAccent="bg-sky-50 dark:bg-sky-900/30"
        />
        <StatCard
          label="Total Weight"
          value={`${totalWeight.toLocaleString()} kg`}
          icon={<PackageIcon className="w-5 h-5 text-amber-600" />}
          bgAccent="bg-amber-50 dark:bg-amber-900/30"
        />
        <StatCard
          label="Avg Value"
          value={total > 0 ? formatCurrency(totalValue / total) : '$0.00'}
          icon={<TrendingUpIcon className="w-5 h-5 text-violet-600" />}
          bgAccent="bg-violet-50 dark:bg-violet-900/30"
        />
      </div>

      {/* Breakdowns */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Status Breakdown</h3>
          <div className="space-y-2">
            {statusBreakdown.map(({ status, count }) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">{status.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${total > 0 ? (count / total) * 100 : 0}%`,
                        backgroundColor: STATUS_COLORS[status] || '#94a3b8',
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Method Breakdown</h3>
          <div className="space-y-2">
            {methodBreakdown.map(({ method, count }) => (
              <div key={method} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {method === 'AIR' ? <PlaneIcon className="w-4 h-4 text-sky-500" /> :
                   method === 'SEA' ? <ShipIcon className="w-4 h-4 text-indigo-500" /> :
                   <TruckIcon className="w-4 h-4 text-amber-500" />}
                  <span className="text-sm text-slate-600 dark:text-slate-400">{method}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${total > 0 ? (count / total) * 100 : 0}%`,
                        backgroundColor: METHOD_COLORS[method] || '#94a3b8',
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Shipment Details</h3>
          <span className="text-xs text-slate-400">Showing {Math.min(shipments.length, 100)} of {total}</span>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white dark:bg-slate-900">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Destination</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Method</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {shipments.slice(0, 100).map((s: any) => (
                <tr key={s.shipmentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-3 py-3 text-sm font-mono font-medium text-slate-900 dark:text-white">{s.shipmentId}</td>
                  <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
                    <div>{s.customerName}</div>
                    {s.customerCompany && <div className="text-xs text-slate-400">{s.customerCompany}</div>}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                    {s.destinationCity}, {s.destinationCountry}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: `${STATUS_COLORS[s.status] || '#94a3b8'}20`,
                        color: STATUS_COLORS[s.status] || '#64748b',
                      }}
                    >
                      {s.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      {s.shippingMethod === 'AIR' ? <PlaneIcon className="w-3.5 h-3.5 text-sky-500" /> :
                       s.shippingMethod === 'SEA' ? <ShipIcon className="w-3.5 h-3.5 text-indigo-500" /> :
                       <TruckIcon className="w-3.5 h-3.5 text-amber-500" />}
                      <span className="text-xs text-slate-600 dark:text-slate-400">{s.shippingMethod}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 text-right">
                    {formatCurrency(s.shipmentValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Revenue Report ────────────────────────────────────

function RevenueReport({ data, chartRefs }: { data: any; chartRefs: React.RefObject<Map<string, HTMLDivElement>> }) {
  const monthlyData = (data.revenueByMonth || []).map((m: any) => ({
    month: formatMonth(m.month),
    revenue: m.revenue,
    shipmentCount: m.shipmentCount,
    averageValue: m.averageValue,
  }));

  const routeData = (data.revenueByRoute || []).slice(0, 8).map((r: any, i: number) => ({
    route: r.route.length > 25 ? r.route.slice(0, 25) + '...' : r.route,
    revenue: r.revenue,
    fill: PALETTE[i % PALETTE.length],
  }));

  const methodData = (data.revenueByMethod || []).map((m: any) => ({
    method: m.method,
    revenue: m.revenue,
    count: m.shipmentCount,
    avg: m.averageValue,
  }));

  const avgTrendData = (data.averageValueTrends || []).map((m: any) => ({
    month: formatMonth(m.month),
    averageValue: m.averageValue,
  }));

  const methodChartConfig: ChartConfig = { revenue: { label: 'Revenue ($)', color: '#059669' } };

  return (
    <>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(data.totalRevenue || 0)}
          icon={<DollarIcon className="w-5 h-5 text-emerald-600" />}
          bgAccent="bg-emerald-50 dark:bg-emerald-900/30"
        />
        <StatCard
          label="Total Shipments"
          value={(data.totalShipments || 0).toLocaleString()}
          icon={<PackageIcon className="w-5 h-5 text-sky-600" />}
          bgAccent="bg-sky-50 dark:bg-sky-900/30"
        />
        <StatCard
          label="Avg Revenue/Ship"
          value={data.totalShipments > 0 ? formatCurrency(data.totalRevenue / data.totalShipments) : '$0.00'}
          icon={<TrendingUpIcon className="w-5 h-5 text-amber-600" />}
          bgAccent="bg-amber-50 dark:bg-amber-900/30"
        />
      </div>

      {/* Revenue by Month */}
      <div
        ref={(el) => { if (el) chartRefs.current?.set('revenue-monthly', el); }}
        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <DollarIcon className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Revenue by Month</h3>
        </div>
        <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
          <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ReportTooltip />} />
            <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Revenue by Route + Method */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div
          ref={(el) => { if (el) chartRefs.current?.set('revenue-route', el); }}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <GlobeIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Revenue by Route</h3>
          </div>
          {routeData.length > 0 ? (
            <ChartContainer config={methodChartConfig} className="h-[280px] w-full">
              <BarChart data={routeData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="route" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={140} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={24}>
                  {routeData.map((entry: any, index: number) => (
                    <Cell key={`cell-r-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">No route data</div>
          )}
        </div>

        <div
          ref={(el) => { if (el) chartRefs.current?.set('revenue-method', el); }}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShipIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Revenue by Method</h3>
          </div>
          <div className="space-y-4">
            {methodData.map((m: any) => {
              const totalRev = methodData.reduce((a: number, b: any) => a + b.revenue, 0);
              const pct = totalRev > 0 ? Math.round((m.revenue / totalRev) * 100) : 0;
              return (
                <div key={m.method} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {m.method === 'AIR' ? <PlaneIcon className="w-5 h-5 text-sky-500" /> :
                       m.method === 'SEA' ? <ShipIcon className="w-5 h-5 text-indigo-500" /> :
                       <TruckIcon className="w-5 h-5 text-amber-500" />}
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{m.method}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(m.revenue)}</div>
                      <div className="text-xs text-slate-400">{m.count} shipments · Avg: {formatCurrency(m.avg)}</div>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: METHOD_COLORS[m.method] || '#059669' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Average Value Trends */}
      <div
        ref={(el) => { if (el) chartRefs.current?.set('revenue-avg-trend', el); }}
        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUpIcon className="w-5 h-5 text-sky-600" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Average Shipment Value Trends</h3>
        </div>
        <ChartContainer config={avgValueChartConfig} className="h-[260px] w-full">
          <LineChart data={avgTrendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
            <Tooltip content={<ReportTooltip />} />
            <Line type="monotone" dataKey="averageValue" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        </ChartContainer>
      </div>
    </>
  );
}

// ─── Customers Report ──────────────────────────────────

function CustomersReport({ data, chartRefs }: { data: any; chartRefs: React.RefObject<Map<string, HTMLDivElement>> }) {
  const growthData = (data.customerGrowth || []).map((m: any) => ({
    month: formatMonth(m.month),
    newCustomers: m.newCustomers,
    totalCustomers: m.totalCustomers,
  }));

  return (
    <>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <StatCard
          label="Total Customers"
          value={(data.totalCustomers || 0).toLocaleString()}
          icon={<UsersIcon className="w-5 h-5 text-emerald-600" />}
          bgAccent="bg-emerald-50 dark:bg-emerald-900/30"
        />
        <StatCard
          label="New This Month"
          value={growthData.length > 0 ? growthData[growthData.length - 1]?.newCustomers || 0 : 0}
          icon={<TrendingUpIcon className="w-5 h-5 text-sky-600" />}
          bgAccent="bg-sky-50 dark:bg-sky-900/30"
        />
      </div>

      {/* Customer Growth Chart */}
      <div
        ref={(el) => { if (el) chartRefs.current?.set('customers-growth', el); }}
        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUpIcon className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Customer Growth</h3>
        </div>
        <ChartContainer config={{ ...newCustomersChartConfig, ...totalCustomersChartConfig }} className="h-[300px] w-full">
          <AreaChart data={growthData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="newCustGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="totalCustGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ReportTooltip />} />
            <Legend />
            <Area yAxisId="right" type="monotone" dataKey="totalCustomers" stroke="#0ea5e9" strokeWidth={2} fill="url(#totalCustGrad)" name="Total Customers" />
            <Area yAxisId="left" type="monotone" dataKey="newCustomers" stroke="#10b981" strokeWidth={2} fill="url(#newCustGrad)" name="New Customers" />
          </AreaChart>
        </ChartContainer>
      </div>

      {/* Top Customers Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Count */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PackageIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Top Customers by Shipments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">#</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Customer</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Shipments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data.topCustomersByCount || []).map((c: any, i: number) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-3 py-3 text-sm text-slate-500">{i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{c.name}</div>
                      <div className="text-xs text-slate-400">{c.company || c.email}</div>
                    </td>
                    <td className="px-3 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 text-right">{c.shipmentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* By Value */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Top Customers by Value</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">#</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Customer</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data.topCustomersByValue || []).map((c: any, i: number) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-3 py-3 text-sm text-slate-500">{i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{c.name}</div>
                      <div className="text-xs text-slate-400">{c.company || c.email}</div>
                    </td>
                    <td className="px-3 py-3 text-sm font-bold text-emerald-600 text-right">{formatCurrency(c.totalValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Stat Card Component ───────────────────────────────

function StatCard({ label, value, icon, bgAccent }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bgAccent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className={`rounded-lg p-2 ${bgAccent}`}>{icon}</div>
      </div>
      <div className="text-xl font-bold text-slate-900 dark:text-white truncate">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
  );
}
