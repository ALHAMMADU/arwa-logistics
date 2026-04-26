import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;

    const now = new Date();

    // ─── Monthly data for last 12 months ───
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const monthMap = new Map<string, { count: number; revenue: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
      monthMap.set(key, { count: 0, revenue: 0 });
    }

    const recentShipments = await db.shipment.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: {
        createdAt: true,
        shipmentValue: true,
        status: true,
        shippingMethod: true,
        destinationCountry: true,
        routeId: true,
      },
    });

    recentShipments.forEach((s) => {
      const monthKey = s.createdAt.toISOString().split('T')[0].substring(0, 7);
      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.count += 1;
        existing.revenue += s.shipmentValue;
      }
    });

    const shipmentsOverTime = Array.from(monthMap.entries()).map(([date, val]) => ({
      date,
      count: val.count,
    }));

    const revenueOverTime = Array.from(monthMap.entries()).map(([date, val]) => ({
      date,
      revenue: Math.round(val.revenue * 100) / 100,
    }));

    // ─── Status distribution (all shipments) ───
    const statusGroups = await db.shipment.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    const statusDistribution = statusGroups.map((s) => ({
      status: s.status,
      count: s._count.status,
    }));

    // ─── Method distribution ───
    const methodGroups = await db.shipment.groupBy({
      by: ['shippingMethod'],
      _count: { shippingMethod: true },
    });
    const methodDistribution = methodGroups.map((m) => ({
      method: m.shippingMethod,
      count: m._count.shippingMethod,
    }));

    // ─── Top countries (destination) ───
    const countryGroups = await db.shipment.groupBy({
      by: ['destinationCountry'],
      _count: { destinationCountry: true },
      orderBy: { _count: { destinationCountry: 'desc' } },
      take: 10,
    });
    const topCountries = countryGroups.map((c) => ({
      country: c.destinationCountry,
      count: c._count.destinationCountry,
    }));

    // ─── Top routes ───
    const routeGroups = await db.shipment.groupBy({
      by: ['routeId'],
      _count: { routeId: true },
      orderBy: { _count: { routeId: 'desc' } },
      take: 10,
    });

    const routeIds = routeGroups.map((r) => r.routeId).filter(Boolean) as string[];
    const routes = await db.shippingRoute.findMany({
      where: { id: { in: routeIds } },
      select: { id: true, name: true },
    });
    const routeNameMap = new Map(routes.map((r) => [r.id, r.name]));

    const topRoutes = routeGroups
      .filter((r) => r.routeId)
      .map((r) => ({
        route: routeNameMap.get(r.routeId!) || 'Unknown Route',
        count: r._count.routeId,
      }));

    return NextResponse.json({
      success: true,
      data: {
        shipmentsOverTime,
        revenueOverTime,
        statusDistribution,
        methodDistribution,
        topCountries,
        topRoutes,
      },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
