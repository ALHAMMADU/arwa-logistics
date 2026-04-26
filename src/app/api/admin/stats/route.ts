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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalShipments,
      activeShipments,
      inTransit,
      deliveredThisMonth,
      totalCustomers,
      activeCustomers,
      totalWarehouses,
      totalRoutes,
      totalCountries,
      shipmentsByStatus,
      shipmentsByMethod,
      recentShipments,
      totalValueResult,
      lastMonthValueResult,
      lastMonthShipmentsCount,
    ] = await Promise.all([
      db.shipment.count(),
      db.shipment.count({ where: { status: { notIn: ['DELIVERED'] } } }),
      db.shipment.count({ where: { status: 'IN_TRANSIT' } }),
      db.shipment.count({ where: { status: 'DELIVERED', updatedAt: { gte: startOfMonth } } }),
      db.user.count({ where: { role: 'CUSTOMER' } }),
      db.user.count({
        where: {
          role: 'CUSTOMER',
          shipments: { some: { createdAt: { gte: thirtyDaysAgo } } },
        },
      }),
      db.warehouse.count({ where: { active: true } }),
      db.shippingRoute.count({ where: { active: true } }),
      db.country.count({ where: { active: true } }),
      db.shipment.groupBy({ by: ['status'], _count: { status: true } }),
      db.shipment.groupBy({ by: ['shippingMethod'], _count: { shippingMethod: true } }),
      db.shipment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, company: true } },
          warehouse: { select: { name: true, city: true } },
        },
      }),
      db.shipment.aggregate({ _sum: { shipmentValue: true } }),
      db.shipment.aggregate({
        _sum: { shipmentValue: true },
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
      }),
      db.shipment.count({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
      }),
    ]);

    // Calculate percentage changes (compare current month vs last month)
    // Current month revenue
    const currentMonthValueResult = await db.shipment.aggregate({
      _sum: { shipmentValue: true },
      where: { createdAt: { gte: startOfMonth } },
    });
    const currentMonthValue = currentMonthValueResult._sum.shipmentValue || 0;
    const lastMonthValue = lastMonthValueResult._sum.shipmentValue || 0;

    const revenueChange = lastMonthValue > 0
      ? Math.round(((currentMonthValue - lastMonthValue) / lastMonthValue) * 100)
      : 0;
    const shipmentChange = lastMonthShipmentsCount > 0
      ? Math.round(((totalShipments - lastMonthShipmentsCount) / lastMonthShipmentsCount) * 100)
      : 0;

    const statusCounts: Record<string, number> = {};
    shipmentsByStatus.forEach((s: any) => { statusCounts[s.status] = s._count.status; });

    const methodCounts: Record<string, number> = {};
    shipmentsByMethod.forEach((m: any) => { methodCounts[m.shippingMethod] = m._count.shippingMethod; });

    return NextResponse.json({
      success: true,
      data: {
        totalShipments,
        activeShipments,
        inTransit,
        deliveredThisMonth,
        totalCustomers,
        activeCustomers,
        totalWarehouses,
        totalRoutes,
        totalCountries,
        totalValue: totalValueResult._sum.shipmentValue || 0,
        totalRevenue: totalValueResult._sum.shipmentValue || 0,
        revenueChange,
        shipmentChange,
        shipmentsByStatus: statusCounts,
        shipmentsByMethod: methodCounts,
        recentShipments,
      },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
