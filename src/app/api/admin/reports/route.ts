import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

// GET /api/admin/reports?type=summary|shipments|revenue|customers
// Query params: type, startDate, endDate, format (json|csv)
export async function GET(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json';

    // Build date filter
    const dateFilter: any = {};
    if (startDateParam) {
      dateFilter.gte = new Date(startDateParam);
    }
    if (endDateParam) {
      dateFilter.lte = new Date(endDateParam);
    }
    const hasDateFilter = startDateParam || endDateParam;
    const whereClause = hasDateFilter ? { createdAt: dateFilter } : {};

    switch (reportType) {
      case 'summary':
        return await handleSummaryReport(whereClause, format);
      case 'shipments':
        return await handleShipmentsReport(whereClause, format);
      case 'revenue':
        return await handleRevenueReport(whereClause, format);
      case 'customers':
        return await handleCustomersReport(whereClause, format);
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report type. Use: summary, shipments, revenue, customers' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Summary Report ──────────────────────────────────────────

async function handleSummaryReport(whereClause: any, format: string) {
  const totalShipments = await db.shipment.count({ where: whereClause });

  const byStatus = await db.shipment.groupBy({
    by: ['status'],
    _count: { status: true },
    where: whereClause,
  });

  const byMethod = await db.shipment.groupBy({
    by: ['shippingMethod'],
    _count: { shippingMethod: true },
    where: whereClause,
  });

  const revenueAgg = await db.shipment.aggregate({
    _sum: { shipmentValue: true },
    _avg: { shipmentValue: true },
    where: whereClause,
  });

  const topCountries = await db.shipment.groupBy({
    by: ['destinationCountry'],
    _count: { destinationCountry: true },
    where: whereClause,
    orderBy: { _count: { destinationCountry: 'desc' } },
    take: 5,
  });

  // Monthly trends for last 12 months
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const monthlyShipments = await db.shipment.findMany({
    where: {
      ...whereClause,
      createdAt: { gte: twelveMonthsAgo },
    },
    select: { createdAt: true, shipmentValue: true, status: true },
  });

  const monthMap = new Map<string, { count: number; revenue: number; delivered: number }>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, { count: 0, revenue: 0, delivered: 0 });
  }
  monthlyShipments.forEach((s) => {
    const key = s.createdAt.toISOString().slice(0, 7);
    const entry = monthMap.get(key);
    if (entry) {
      entry.count += 1;
      entry.revenue += s.shipmentValue;
      if (s.status === 'DELIVERED') entry.delivered += 1;
    }
  });

  const monthlyTrends = Array.from(monthMap.entries()).map(([month, val]) => ({
    month,
    shipments: val.count,
    revenue: Math.round(val.revenue * 100) / 100,
    delivered: val.delivered,
  }));

  // Warehouse utilization
  const warehouses = await db.warehouse.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      city: true,
      capacity: true,
      shipments: {
        where: {
          status: {
            in: ['RECEIVED_AT_WAREHOUSE', 'PROCESSING', 'READY_FOR_DISPATCH'],
          },
        },
        select: { id: true },
      },
    },
  });

  const warehouseUtilization = warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    city: w.city,
    capacity: w.capacity,
    activeShipments: w.shipments.length,
    utilizationPercent: w.capacity > 0
      ? Math.round((w.shipments.length / w.capacity) * 100 * 100) / 100
      : 0,
  }));

  const data = {
    totalShipments,
    shipmentsByStatus: byStatus.map((s) => ({ status: s.status, count: s._count.status })),
    shipmentsByMethod: byMethod.map((m) => ({ method: m.shippingMethod, count: m._count.shippingMethod })),
    revenue: {
      total: revenueAgg._sum.shipmentValue || 0,
      averagePerShipment: Math.round((revenueAgg._avg.shipmentValue || 0) * 100) / 100,
    },
    topDestinationCountries: topCountries.map((c) => ({ country: c.destinationCountry, count: c._count.destinationCountry })),
    monthlyTrends,
    warehouseUtilization,
  };

  if (format === 'csv') {
    return createCsvResponse('summary', data);
  }

  return NextResponse.json({ success: true, data });
}

// ─── Shipments Report ────────────────────────────────────────

async function handleShipmentsReport(whereClause: any, format: string) {
  const shipments = await db.shipment.findMany({
    where: whereClause,
    include: {
      customer: { select: { name: true, email: true, company: true } },
      warehouse: { select: { name: true, city: true } },
      route: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const data = shipments.map((s) => ({
    shipmentId: s.shipmentId,
    trackingNumber: s.trackingNumber,
    senderName: s.senderName,
    receiverName: s.receiverName,
    destinationCountry: s.destinationCountry,
    destinationCity: s.destinationCity,
    weight: s.weight,
    shipmentValue: s.shipmentValue,
    shippingMethod: s.shippingMethod,
    shipmentType: s.shipmentType,
    status: s.status,
    customerName: s.customer.name,
    customerEmail: s.customer.email,
    customerCompany: s.customer.company || '',
    warehouse: s.warehouse ? `${s.warehouse.name} (${s.warehouse.city})` : '',
    route: s.route?.name || '',
    createdAt: s.createdAt.toISOString(),
    estimatedDelivery: s.estimatedDelivery?.toISOString() || '',
    actualDelivery: s.actualDelivery?.toISOString() || '',
  }));

  if (format === 'csv') {
    return createShipmentsCsv(data);
  }

  return NextResponse.json({ success: true, data, total: data.length });
}

// ─── Revenue Report ──────────────────────────────────────────

async function handleRevenueReport(whereClause: any, format: string) {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const revenueShipments = await db.shipment.findMany({
    where: {
      ...whereClause,
      createdAt: { gte: twelveMonthsAgo },
    },
    select: {
      createdAt: true,
      shipmentValue: true,
      shippingMethod: true,
      destinationCountry: true,
      routeId: true,
    },
  });

  // Revenue by month
  const monthMap = new Map<string, { total: number; count: number }>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, { total: 0, count: 0 });
  }
  revenueShipments.forEach((s) => {
    const key = s.createdAt.toISOString().slice(0, 7);
    const entry = monthMap.get(key);
    if (entry) {
      entry.total += s.shipmentValue;
      entry.count += 1;
    }
  });
  const revenueByMonth = Array.from(monthMap.entries()).map(([month, val]) => ({
    month,
    revenue: Math.round(val.total * 100) / 100,
    shipmentCount: val.count,
    averageValue: val.count > 0 ? Math.round((val.total / val.count) * 100) / 100 : 0,
  }));

  // Revenue by route
  const routeMap = new Map<string, { revenue: number; count: number; routeId: string }>();
  revenueShipments.forEach((s) => {
    const key = s.routeId || 'no-route';
    const entry = routeMap.get(key) || { revenue: 0, count: 0, routeId: s.routeId || '' };
    entry.revenue += s.shipmentValue;
    entry.count += 1;
    routeMap.set(key, entry);
  });

  const routeIds = Array.from(routeMap.values())
    .filter((r) => r.routeId)
    .map((r) => r.routeId);
  const routes = await db.shippingRoute.findMany({
    where: { id: { in: routeIds } },
    select: { id: true, name: true },
  });
  const routeNameMap = new Map(routes.map((r) => [r.id, r.name]));

  const revenueByRoute = Array.from(routeMap.entries())
    .map(([, val]) => ({
      route: val.routeId ? (routeNameMap.get(val.routeId) || 'Unknown Route') : 'No Route Assigned',
      revenue: Math.round(val.revenue * 100) / 100,
      shipmentCount: val.count,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Revenue by shipping method
  const methodMap = new Map<string, { revenue: number; count: number }>();
  revenueShipments.forEach((s) => {
    const entry = methodMap.get(s.shippingMethod) || { revenue: 0, count: 0 };
    entry.revenue += s.shipmentValue;
    entry.count += 1;
    methodMap.set(s.shippingMethod, entry);
  });
  const revenueByMethod = Array.from(methodMap.entries()).map(([method, val]) => ({
    method,
    revenue: Math.round(val.revenue * 100) / 100,
    shipmentCount: val.count,
    averageValue: val.count > 0 ? Math.round((val.revenue / val.count) * 100) / 100 : 0,
  }));

  const averageValueTrends = revenueByMonth.map((m) => ({
    month: m.month,
    averageValue: m.averageValue,
  }));

  const data = {
    revenueByMonth,
    revenueByRoute,
    revenueByMethod,
    averageValueTrends,
    totalRevenue: revenueByMonth.reduce((sum, m) => sum + m.revenue, 0),
    totalShipments: revenueByMonth.reduce((sum, m) => sum + m.shipmentCount, 0),
  };

  if (format === 'csv') {
    return createCsvResponse('revenue', data);
  }

  return NextResponse.json({ success: true, data });
}

// ─── Customers Report ────────────────────────────────────────

async function handleCustomersReport(whereClause: any, format: string) {
  // Top customers by shipment count
  const customersByCount = await db.user.findMany({
    where: { role: 'CUSTOMER' },
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      createdAt: true,
      _count: { select: { shipments: { where: whereClause } } },
    },
    orderBy: { shipments: { _count: 'desc' } },
    take: 10,
  });

  const topCustomersByCount = customersByCount
    .filter((c) => c._count.shipments > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      company: c.company || '',
      shipmentCount: c._count.shipments,
    }));

  // Top customers by value
  const customersWithValue = await db.user.findMany({
    where: { role: 'CUSTOMER' },
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      shipments: {
        where: whereClause,
        select: { shipmentValue: true },
      },
    },
  });

  const topCustomersByValue = customersWithValue
    .map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      company: c.company || '',
      totalValue: c.shipments.reduce((sum, s) => sum + s.shipmentValue, 0),
      shipmentCount: c.shipments.length,
    }))
    .filter((c) => c.shipmentCount > 0)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10)
    .map((c) => ({
      ...c,
      totalValue: Math.round(c.totalValue * 100) / 100,
    }));

  // Customer growth over time
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const newCustomers = await db.user.findMany({
    where: {
      role: 'CUSTOMER',
      createdAt: { gte: twelveMonthsAgo },
    },
    select: { createdAt: true },
  });

  const growthMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    growthMap.set(key, 0);
  }
  newCustomers.forEach((c) => {
    const key = c.createdAt.toISOString().slice(0, 7);
    const val = growthMap.get(key);
    if (val !== undefined) {
      growthMap.set(key, val + 1);
    }
  });

  let cumulative = await db.user.count({
    where: {
      role: 'CUSTOMER',
      createdAt: { lt: twelveMonthsAgo },
    },
  });

  const customerGrowth = Array.from(growthMap.entries()).map(([month, newCount]) => {
    cumulative += newCount;
    return { month, newCustomers: newCount, totalCustomers: cumulative };
  });

  const totalCustomers = await db.user.count({ where: { role: 'CUSTOMER' } });

  const data = {
    topCustomersByCount,
    topCustomersByValue,
    customerGrowth,
    totalCustomers,
  };

  if (format === 'csv') {
    return createCsvResponse('customers', data);
  }

  return NextResponse.json({ success: true, data });
}

// ─── CSV Helpers ─────────────────────────────────────────────

function escapeCsvField(field: unknown): string {
  const str = String(field ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function createCsvResponse(reportType: string, data: any) {
  let csvContent = '';

  switch (reportType) {
    case 'summary': {
      const rows: string[][] = [];
      rows.push(['ARWA LOGISTICS - Summary Report']);
      rows.push([]);
      rows.push(['Total Shipments', data.totalShipments]);
      rows.push(['Total Revenue', data.revenue.total]);
      rows.push(['Average Revenue per Shipment', data.revenue.averagePerShipment]);
      rows.push([]);
      rows.push(['Shipments by Status']);
      rows.push(['Status', 'Count']);
      data.shipmentsByStatus.forEach((s: any) => rows.push([s.status, s.count]));
      rows.push([]);
      rows.push(['Shipments by Method']);
      rows.push(['Method', 'Count']);
      data.shipmentsByMethod.forEach((m: any) => rows.push([m.method, m.count]));
      rows.push([]);
      rows.push(['Top 5 Destination Countries']);
      rows.push(['Country', 'Shipments']);
      data.topDestinationCountries.forEach((c: any) => rows.push([c.country, c.count]));
      rows.push([]);
      rows.push(['Monthly Trends (Last 12 Months)']);
      rows.push(['Month', 'Shipments', 'Revenue', 'Delivered']);
      data.monthlyTrends.forEach((m: any) => rows.push([m.month, m.shipments, m.revenue, m.delivered]));
      rows.push([]);
      rows.push(['Warehouse Utilization']);
      rows.push(['Warehouse', 'City', 'Capacity', 'Active Shipments', 'Utilization %']);
      data.warehouseUtilization.forEach((w: any) => rows.push([w.name, w.city, w.capacity, w.activeShipments, w.utilizationPercent]));
      csvContent = rows.map((r) => r.map(escapeCsvField).join(',')).join('\n');
      break;
    }
    case 'revenue': {
      const rows: string[][] = [];
      rows.push(['ARWA LOGISTICS - Revenue Report']);
      rows.push([]);
      rows.push(['Total Revenue', data.totalRevenue]);
      rows.push(['Total Shipments', data.totalShipments]);
      rows.push([]);
      rows.push(['Revenue by Month']);
      rows.push(['Month', 'Revenue', 'Shipment Count', 'Average Value']);
      data.revenueByMonth.forEach((m: any) => rows.push([m.month, m.revenue, m.shipmentCount, m.averageValue]));
      rows.push([]);
      rows.push(['Revenue by Route']);
      rows.push(['Route', 'Revenue', 'Shipment Count']);
      data.revenueByRoute.forEach((r: any) => rows.push([r.route, r.revenue, r.shipmentCount]));
      rows.push([]);
      rows.push(['Revenue by Shipping Method']);
      rows.push(['Method', 'Revenue', 'Shipment Count', 'Average Value']);
      data.revenueByMethod.forEach((m: any) => rows.push([m.method, m.revenue, m.shipmentCount, m.averageValue]));
      csvContent = rows.map((r) => r.map(escapeCsvField).join(',')).join('\n');
      break;
    }
    case 'customers': {
      const rows: string[][] = [];
      rows.push(['ARWA LOGISTICS - Customers Report']);
      rows.push([]);
      rows.push(['Total Customers', data.totalCustomers]);
      rows.push([]);
      rows.push(['Top Customers by Shipment Count']);
      rows.push(['Name', 'Email', 'Company', 'Shipments']);
      data.topCustomersByCount.forEach((c: any) => rows.push([c.name, c.email, c.company, c.shipmentCount]));
      rows.push([]);
      rows.push(['Top Customers by Value']);
      rows.push(['Name', 'Email', 'Company', 'Total Value', 'Shipments']);
      data.topCustomersByValue.forEach((c: any) => rows.push([c.name, c.email, c.company, c.totalValue, c.shipmentCount]));
      rows.push([]);
      rows.push(['Customer Growth (Last 12 Months)']);
      rows.push(['Month', 'New Customers', 'Total Customers']);
      data.customerGrowth.forEach((m: any) => rows.push([m.month, m.newCustomers, m.totalCustomers]));
      csvContent = rows.map((r) => r.map(escapeCsvField).join(',')).join('\n');
      break;
    }
  }

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="arwa-${reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

function createShipmentsCsv(shipments: any[]) {
  const headers = [
    'Shipment ID', 'Tracking Number', 'Sender Name', 'Receiver Name',
    'Destination Country', 'Destination City', 'Weight (kg)',
    'Shipment Value (USD)', 'Shipping Method', 'Shipment Type', 'Status',
    'Customer Name', 'Customer Email', 'Customer Company',
    'Warehouse', 'Route', 'Created At', 'Estimated Delivery', 'Actual Delivery',
  ];

  const rows = shipments.map((s) => [
    s.shipmentId, s.trackingNumber, s.senderName, s.receiverName,
    s.destinationCountry, s.destinationCity, s.weight,
    s.shipmentValue, s.shippingMethod, s.shipmentType, s.status,
    s.customerName, s.customerEmail, s.customerCompany,
    s.warehouse, s.route, s.createdAt, s.estimatedDelivery, s.actualDelivery,
  ]);

  const csvContent = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((r) => r.map(escapeCsvField).join(',')),
  ].join('\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="arwa-shipments-report-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
