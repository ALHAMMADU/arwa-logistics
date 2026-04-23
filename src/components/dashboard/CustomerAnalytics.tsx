'use client';

import React from 'react';
import { apiFetch } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { PackageIcon, DollarIcon, TrendingUpIcon, MapPinIcon, BarChartIcon, ClockIcon, CheckCircleIcon, PlaneIcon, ShipIcon, TruckIcon } from '@/components/icons';
import { SHIPMENT_STATUS_LABELS, SHIPPING_METHOD_LABELS } from '@/lib/shipping';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

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
  SEA: '#7c3aed',
  LAND: '#f59e0b',
};

const DESTINATION_COLORS = ['#059669', '#0ea5e9', '#f59e0b', '#a855f7', '#f97316'];

const PERFORMANCE_COLORS: Record<string, string> = {
  onTime: '#10b981',
  delayed: '#f59e0b',
  early: '#0ea5e9',
};

// ─── Chart Configs ───────────────────────────────────────

const shipmentsChartConfig: ChartConfig = {
  count: { label: 'Shipments', color: '#10b981' },
};

// ─── Custom Tooltips ────────────────────────────────────

function ShipmentsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      <p className="text-emerald-700 font-semibold">{payload[0].value} shipments</p>
    </div>
  );
}

function DestinationsTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl">
      <p className="text-emerald-700 font-semibold">{payload[0].value} shipments</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export default function CustomerAnalytics() {
  const { data: stats, loading } = useFetch<any>(
    () => apiFetch('/customer/stats').then((r) => (r.success ? r.data : null)),
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <span className="text-sm text-slate-400">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <BarChartIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600">No analytics data available</h3>
          <p className="text-slate-400 mt-2">Create some shipments to see your analytics</p>
        </div>
      </div>
    );
  }

  // Prepare monthly shipments data for area chart
  const monthlyData = (stats.monthlyShipments || []).map((m: any) => {
    const d = new Date(m.month + '-01T00:00:00');
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    return { month: label, count: m.count };
  });

  // Prepare status distribution for donut chart
  const statusData = Object.entries(stats.shipmentsByStatus || {}).map(([status, count]) => ({
    name: SHIPMENT_STATUS_LABELS[status] || status,
    value: count as number,
    status,
    fill: STATUS_COLORS[status] || '#94a3b8',
  }));

  // Prepare method distribution for pie chart
  const methodData = Object.entries(stats.shipmentsByMethod || {}).map(([method, count]) => ({
    name: SHIPPING_METHOD_LABELS[method] || method,
    value: count as number,
    method,
    fill: METHOD_COLORS[method] || '#94a3b8',
  }));

  // Prepare top destinations for horizontal bar chart
  const destinationData = (stats.topDestinations || []).map((d: any, i: number) => ({
    country: d.country,
    count: d.count,
    fill: DESTINATION_COLORS[i % DESTINATION_COLORS.length],
  }));

  // Prepare delivery performance data for pie chart
  const perfData = Object.entries(stats.deliveryPerformance || {}).map(([key, value]) => ({
    name: key === 'onTime' ? 'On Time' : key === 'delayed' ? 'Delayed' : 'Early',
    value: value as number,
    key,
    fill: PERFORMANCE_COLORS[key] || '#94a3b8',
  }));

  // Build dynamic chart configs
  const dynamicStatusChartConfig: ChartConfig = { count: { label: 'Shipments' } };
  statusData.forEach((s: any) => {
    dynamicStatusChartConfig[s.status] = { label: s.name, color: s.fill };
  });

  const dynamicMethodChartConfig: ChartConfig = { count: { label: 'Shipments' } };
  methodData.forEach((m: any) => {
    dynamicMethodChartConfig[m.method] = { label: m.name, color: m.fill };
  });

  const dynamicDestChartConfig: ChartConfig = { count: { label: 'Shipments' } };
  destinationData.forEach((d: any) => {
    dynamicDestChartConfig[d.country] = { label: d.country, color: d.fill };
  });

  const dynamicPerfChartConfig: ChartConfig = { count: { label: 'Performance' } };
  perfData.forEach((p: any) => {
    dynamicPerfChartConfig[p.key] = { label: p.name, color: p.fill };
  });

  // Summary card values
  const totalShipments = stats.totalShipments || 0;
  const totalSpent = stats.totalSpent || 0;
  const averageWeight = stats.averageWeight || 0;
  const deliveryRate = stats.deliveryPerformance?.onTime || 0;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Analytics Dashboard</h1>
        <p className="text-slate-500 text-sm">Your shipping performance and insights</p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Shipments',
            value: totalShipments.toLocaleString(),
            icon: <PackageIcon className="w-5 h-5 text-emerald-600" />,
            bgAccent: 'bg-emerald-50',
            sparkColor: '#059669',
          },
          {
            label: 'Total Spent',
            value: `$${totalSpent.toLocaleString()}`,
            icon: <DollarIcon className="w-5 h-5 text-sky-600" />,
            bgAccent: 'bg-sky-50',
            sparkColor: '#0284c7',
          },
          {
            label: 'Average Weight',
            value: `${averageWeight} kg`,
            icon: <TrendingUpIcon className="w-5 h-5 text-amber-600" />,
            bgAccent: 'bg-amber-50',
            sparkColor: '#d97706',
          },
          {
            label: 'Delivery Rate',
            value: `${deliveryRate}%`,
            icon: <CheckCircleIcon className="w-5 h-5 text-violet-600" />,
            bgAccent: 'bg-violet-50',
            sparkColor: '#7c3aed',
          },
        ].map((card, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`rounded-lg p-2 ${card.bgAccent}`}>{card.icon}</div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{card.value}</div>
            <div className="text-xs text-slate-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row 1: Monthly Shipments (Area) ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUpIcon className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-semibold text-slate-900">Shipments Over Time</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">Monthly shipment count for the last 12 months</p>
        <ChartContainer config={shipmentsChartConfig} className="h-[280px] w-full">
          <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="customerShipmentsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
              allowDecimals={false}
            />
            <Tooltip content={<ShipmentsTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#customerShipmentsGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ChartContainer>
      </div>

      {/* ── Charts Row 2: Status Distribution + Shipping Methods ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status Distribution - Donut Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChartIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">Status Distribution</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">Shipment breakdown by current status</p>
          {statusData.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <ChartContainer config={dynamicStatusChartConfig} className="h-[240px] w-full max-w-[240px]">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {statusData.map((entry: any, index: number) => (
                      <Cell key={`cell-status-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                </PieChart>
              </ChartContainer>
              <div className="flex-1 space-y-1.5 max-h-[240px] overflow-y-auto pr-1 w-full">
                {statusData.map((s: any) => (
                  <div key={s.status} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                      <span className="text-xs text-slate-600 truncate">{s.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-800 shrink-0">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
              No status data available
            </div>
          )}
        </div>

        {/* Shipping Methods - Pie Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShipIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">Shipping Methods</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">Shipment distribution by shipping method</p>
          {methodData.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <ChartContainer config={dynamicMethodChartConfig} className="h-[240px] w-full max-w-[240px]">
                <PieChart>
                  <Pie
                    data={methodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {methodData.map((entry: any, index: number) => (
                      <Cell key={`cell-method-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                </PieChart>
              </ChartContainer>
              <div className="flex-1 space-y-2 w-full">
                {methodData.map((m: any) => {
                  const methodIcon =
                    m.method === 'AIR' ? (
                      <PlaneIcon className="w-5 h-5" />
                    ) : m.method === 'SEA' ? (
                      <ShipIcon className="w-5 h-5" />
                    ) : (
                      <TruckIcon className="w-5 h-5" />
                    );
                  const total = methodData.reduce((a: number, b: any) => a + b.value, 0);
                  const pct = total > 0 ? Math.round((m.value / total) * 100) : 0;
                  return (
                    <div key={m.method} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${m.fill}15` }}
                      >
                        {methodIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-700">{m.name}</div>
                        <div className="text-xs text-slate-400">{m.value} shipments</div>
                      </div>
                      <div className="text-lg font-bold text-slate-800">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
              No method data available
            </div>
          )}
        </div>
      </div>

      {/* ── Charts Row 3: Top Destinations + Delivery Performance ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Destinations - Horizontal Bar Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPinIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">Top Destinations</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">Top 5 destination countries by shipment volume</p>
          {destinationData.length > 0 ? (
            <ChartContainer config={dynamicDestChartConfig} className="h-[280px] w-full">
              <BarChart data={destinationData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="country"
                  tick={{ fontSize: 12, fill: '#475569' }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip content={<DestinationsTooltip />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={24}>
                  {destinationData.map((entry: any, index: number) => (
                    <Cell key={`cell-dest-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
              No destination data available
            </div>
          )}
        </div>

        {/* Delivery Performance - Donut Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-slate-900">Delivery Performance</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">Estimated delivery performance breakdown</p>
          {perfData.length > 0 && perfData.some((p: any) => p.value > 0) ? (
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <ChartContainer config={dynamicPerfChartConfig} className="h-[240px] w-full max-w-[240px]">
                <PieChart>
                  <Pie
                    data={perfData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {perfData.map((entry: any, index: number) => (
                      <Cell key={`cell-perf-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                </PieChart>
              </ChartContainer>
              <div className="flex-1 space-y-2 w-full">
                {perfData.map((p: any) => {
                  const icons: Record<string, React.ReactNode> = {
                    onTime: <CheckCircleIcon className="w-5 h-5" />,
                    delayed: <ClockIcon className="w-5 h-5" />,
                    early: <TrendingUpIcon className="w-5 h-5" />,
                  };
                  return (
                    <div key={p.key} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${p.fill}15` }}
                      >
                        {icons[p.key] || <CheckCircleIcon className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-700">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.value}% of deliveries</div>
                      </div>
                      <div className="text-lg font-bold text-slate-800">{p.value}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
              No delivery data available yet
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClockIcon className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-semibold text-slate-900">Recent Activity</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">Latest 5 tracking events from your shipments</p>
        {(stats.recentActivity || []).length > 0 ? (
          <div className="space-y-3">
            {(stats.recentActivity || []).map((event: any, index: number) => (
              <div
                key={index}
                className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 font-mono">{event.shipmentId}</span>
                      <span
                        className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
                        style={{
                          backgroundColor: `${STATUS_COLORS[event.status] || '#94a3b8'}20`,
                          color: STATUS_COLORS[event.status] || '#64748b',
                        }}
                      >
                        {SHIPMENT_STATUS_LABELS[event.status] || event.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500">
                      <MapPinIcon className="w-3 h-3 inline mr-1" />
                      {event.location}
                    </span>
                    {event.destination && (
                      <span className="text-xs text-slate-400">
                        → {event.destination}
                      </span>
                    )}
                  </div>
                  {event.notes && (
                    <p className="text-xs text-slate-400 mt-1">{event.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[120px] text-slate-400 text-sm">
            No recent activity found
          </div>
        )}
      </div>
    </div>
  );
}
