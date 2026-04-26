import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

export async function GET(request: Request) {
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const access = checkAccess(request, { roles: ['ADMIN'] });
  if (!access.allowed) return access.response;

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    // KPI metrics
    const [
      totalShipments,
      totalCustomers,
      totalRevenue,
      activeShipments,
      todayShipments,
      weekShipments,
      monthShipments,
      lastMonthShipments,
      monthRevenue,
      lastMonthRevenue,
      deliveredThisMonth,
    ] = await Promise.all([
      db.shipment.count(),
      db.user.count({ where: { role: 'CUSTOMER' } }),
      db.shipment.aggregate({ _sum: { shipmentValue: true }, where: { status: 'DELIVERED' } }),
      db.shipment.count({ where: { active: true, status: { notIn: ['DELIVERED'] } } }),
      db.shipment.count({ where: { createdAt: { gte: today } } }),
      db.shipment.count({ where: { createdAt: { gte: thisWeek } } }),
      db.shipment.count({ where: { createdAt: { gte: thisMonth } } }),
      db.shipment.count({ where: { createdAt: { gte: lastMonth, lt: thisMonth } } }),
      db.payment.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED', paidAt: { gte: thisMonth } } }),
      db.payment.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED', paidAt: { gte: lastMonth, lt: thisMonth } } }),
      db.shipment.count({ where: { status: 'DELIVERED', actualDelivery: { gte: thisMonth } } }),
    ]);

    // Average delivery days (for delivered shipments in last 3 months)
    const deliveredShipments = await db.shipment.findMany({
      where: {
        status: 'DELIVERED',
        actualDelivery: { not: null },
        createdAt: { gte: threeMonthsAgo },
      },
      select: { createdAt: true, actualDelivery: true },
    });

    let avgDeliveryDays = 0;
    if (deliveredShipments.length > 0) {
      const totalDays = deliveredShipments.reduce((sum, s) => {
        if (s.actualDelivery) {
          const days = (new Date(s.actualDelivery).getTime() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }
        return sum;
      }, 0);
      avgDeliveryDays = Math.round((totalDays / deliveredShipments.length) * 10) / 10;
    }

    // Shipment growth rate
    const shipmentGrowthRate = lastMonthShipments > 0
      ? Math.round(((monthShipments - lastMonthShipments) / lastMonthShipments) * 100)
      : 0;

    // Revenue growth rate
    const currentRev = monthRevenue._sum.amount || 0;
    const lastRev = lastMonthRevenue._sum.amount || 0;
    const revenueGrowthRate = lastRev > 0
      ? Math.round(((currentRev - lastRev) / lastRev) * 100)
      : 0;

    // Monthly trends (last 6 months, reduced for performance)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      try {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const [shipments, revenue, newCustomers] = await Promise.all([
          db.shipment.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
          db.payment.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED', paidAt: { gte: monthStart, lt: monthEnd } } }),
          db.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: monthStart, lt: monthEnd } } }),
        ]);

        monthlyTrends.push({
          month: monthStart.toISOString().substring(0, 7),
          shipments,
          revenue: revenue._sum.amount || 0,
          newCustomers,
        });
      } catch {
        // Skip this month if query fails
      }
    }

    // Shipment status distribution
    const statusDistribution = await db.shipment.groupBy({
      by: ['status'],
      _count: { status: true },
      where: { active: true },
    });

    // Shipping method distribution
    const methodDistribution = await db.shipment.groupBy({
      by: ['shippingMethod'],
      _count: { shippingMethod: true },
    });

    // Top destinations
    const topDestinations = await db.shipment.groupBy({
      by: ['destinationCountry'],
      _count: { destinationCountry: true },
      _sum: { shipmentValue: true },
      orderBy: { _count: { destinationCountry: 'desc' } },
      take: 10,
    });

    // Top customers by shipment count
    const topCustomers = await db.user.findMany({
      where: { role: 'CUSTOMER' },
      include: {
        _count: { select: { shipments: true } },
        shipments: {
          select: { shipmentValue: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { shipments: { _count: 'desc' } },
      take: 10,
    });

    // Warehouse utilization
    const warehouseUtilization = await db.warehouse.findMany({
      where: { active: true },
      include: {
        _count: { select: { shipments: true } },
        manager: { select: { name: true } },
      },
    });

    // Payment method distribution
    const paymentMethodDistribution = await db.payment.groupBy({
      by: ['method'],
      _count: { method: true },
      _sum: { amount: true },
    });

    // Revenue by shipping method
    const revenueByMethod = await db.shipment.groupBy({
      by: ['shippingMethod'],
      _sum: { shipmentValue: true },
      _count: { shippingMethod: true },
      where: { status: 'DELIVERED' },
    });

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalShipments,
          totalCustomers,
          totalRevenue: totalRevenue._sum.shipmentValue || 0,
          activeShipments,
          todayShipments,
          weekShipments,
          monthShipments,
          monthRevenue: currentRev,
          shipmentGrowthRate,
          revenueGrowthRate,
          deliveredThisMonth,
          avgDeliveryDays,
        },
        monthlyTrends,
        statusDistribution: statusDistribution.map(s => ({
          status: s.status,
          count: s._count.status,
        })),
        methodDistribution: methodDistribution.map(m => ({
          method: m.shippingMethod,
          count: m._count.shippingMethod,
        })),
        topDestinations: topDestinations.map(d => ({
          country: d.destinationCountry,
          count: d._count.destinationCountry,
          value: d._sum.shipmentValue || 0,
        })),
        topCustomers: topCustomers.map(c => ({
          id: c.id,
          name: c.name,
          company: c.company,
          shipmentCount: c._count.shipments,
          lastShipmentValue: c.shipments[0]?.shipmentValue || 0,
        })),
        warehouseUtilization: warehouseUtilization.map(w => ({
          id: w.id,
          name: w.name,
          city: w.city,
          capacity: w.capacity,
          shipmentCount: w._count.shipments,
          manager: w.manager?.name,
        })),
        paymentMethodDistribution: paymentMethodDistribution.map(p => ({
          method: p.method,
          count: p._count.method,
          total: p._sum.amount || 0,
        })),
        revenueByMethod: revenueByMethod.map(r => ({
          method: r.shippingMethod,
          revenue: r._sum.shipmentValue || 0,
          count: r._count.shippingMethod,
        })),
      },
    });
  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
