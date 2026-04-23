import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

// GET /api/admin/finance?period=month|quarter|year|custom&startDate=&endDate=&shippingMethod=
export async function GET(request: Request) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'year';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const shippingMethod = searchParams.get('shippingMethod');

    // ─── Build date ranges ───
    const now = new Date();
    let filterStart: Date;
    let filterEnd: Date = now;
    let prevPeriodStart: Date;
    let prevPeriodEnd: Date;

    switch (period) {
      case 'month':
        filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
        prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'quarter':
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        filterStart = new Date(now.getFullYear(), qMonth, 1);
        prevPeriodStart = new Date(now.getFullYear(), qMonth - 3, 1);
        prevPeriodEnd = new Date(now.getFullYear(), qMonth, 0);
        break;
      case 'custom':
        filterStart = startDateParam ? new Date(startDateParam) : new Date(now.getFullYear(), now.getMonth(), 1);
        filterEnd = endDateParam ? new Date(endDateParam + 'T23:59:59.999Z') : now;
        // For custom, approximate previous period as same length before start
        const diff = filterEnd.getTime() - filterStart.getTime();
        prevPeriodStart = new Date(filterStart.getTime() - diff);
        prevPeriodEnd = new Date(filterStart.getTime() - 1);
        break;
      default: // year
        filterStart = new Date(now.getFullYear(), 0, 1);
        prevPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
        prevPeriodEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
    }

    // ─── Build where clause ───
    const dateFilter: any = {
      gte: filterStart,
      lte: filterEnd,
    };
    const prevDateFilter: any = {
      gte: prevPeriodStart,
      lte: prevPeriodEnd,
    };

    const shipmentWhere: any = { createdAt: dateFilter };
    const prevShipmentWhere: any = { createdAt: prevDateFilter };
    if (shippingMethod) {
      shipmentWhere.shippingMethod = shippingMethod;
      prevShipmentWhere.shippingMethod = shippingMethod;
    }

    // ─── Parallel queries ───
    const [
      currentRevenue,
      previousRevenue,
      currentShipmentCount,
      previousShipmentCount,
      outstandingPayments,
      avgOrderValueResult,
      revenueByMethodData,
      revenueByRouteRaw,
      paymentsByStatusData,
      monthlyRevenueData,
      dailyRevenueData,
      topCustomersRaw,
      recentPayments,
      overduePayments,
    ] = await Promise.all([
      // Current period revenue (from payments)
      db.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: ['COMPLETED', 'PENDING', 'PROCESSING'] },
          createdAt: dateFilter,
          ...(shippingMethod ? { shipment: { shippingMethod: shippingMethod as any } } : {}),
        },
      }),

      // Previous period revenue
      db.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: ['COMPLETED', 'PENDING', 'PROCESSING'] },
          createdAt: prevDateFilter,
          ...(shippingMethod ? { shipment: { shippingMethod: shippingMethod as any } } : {}),
        },
      }),

      // Current period shipment count
      db.shipment.count({ where: shipmentWhere }),

      // Previous period shipment count
      db.shipment.count({ where: prevShipmentWhere }),

      // Outstanding payments (PENDING + PROCESSING)
      db.payment.aggregate({
        _sum: { amount: true },
        _count: true,
        where: {
          status: { in: ['PENDING', 'PROCESSING'] },
          ...(shippingMethod ? { shipment: { shippingMethod: shippingMethod as any } } : {}),
        },
      }),

      // Average order value
      db.payment.aggregate({
        _avg: { amount: true },
        where: {
          status: { in: ['COMPLETED', 'PENDING', 'PROCESSING'] },
          ...(shippingMethod ? { shipment: { shippingMethod: shippingMethod as any } } : {}),
        },
      }),

      // Revenue by shipping method
      db.payment.findMany({
        where: {
          status: { in: ['COMPLETED', 'PENDING', 'PROCESSING'] },
          ...(shippingMethod ? { shipment: { shippingMethod: shippingMethod as any } } : {}),
        },
        select: {
          amount: true,
          shipment: { select: { shippingMethod: true } },
        },
      }),

      // Revenue by route (raw)
      db.payment.findMany({
        where: {
          status: { in: ['COMPLETED', 'PENDING', 'PROCESSING'] },
          createdAt: dateFilter,
          ...(shippingMethod ? { shipment: { shippingMethod: shippingMethod as any } } : {}),
        },
        select: {
          amount: true,
          shipment: { select: { routeId: true, route: { select: { name: true } } } },
        },
      }),

      // Payments by status
      db.payment.groupBy({
        by: ['status'],
        _count: { status: true },
        _sum: { amount: true },
      }),

      // Monthly revenue for last 12 months
      db.payment.findMany({
        where: {
          status: { in: ['COMPLETED', 'PENDING', 'PROCESSING'] },
          createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) },
          ...(shippingMethod ? { shipment: { shippingMethod: shippingMethod as any } } : {}),
        },
        select: {
          amount: true,
          createdAt: true,
        },
      }),

      // Daily revenue for last 30 days
      db.payment.findMany({
        where: {
          status: { in: ['COMPLETED', 'PENDING', 'PROCESSING'] },
          createdAt: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
          ...(shippingMethod ? { shipment: { shippingMethod: shippingMethod as any } } : {}),
        },
        select: {
          amount: true,
          createdAt: true,
        },
      }),

      // Top customers by total spending (raw payments)
      db.payment.findMany({
        where: {
          status: { in: ['COMPLETED', 'PENDING', 'PROCESSING'] },
          ...(shippingMethod ? { shipment: { shippingMethod: shippingMethod as any } } : {}),
        },
        select: {
          amount: true,
          userId: true,
          user: { select: { id: true, name: true, email: true, company: true } },
        },
      }),

      // Recent payments
      db.payment.findMany({
        where: {
          ...(shippingMethod ? { shipment: { shippingMethod: shippingMethod as any } } : {}),
        },
        include: {
          shipment: {
            select: {
              shipmentId: true,
              trackingNumber: true,
              destinationCity: true,
              destinationCountry: true,
              shippingMethod: true,
            },
          },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Overdue payments (PENDING older than 30 days)
      db.payment.findMany({
        where: {
          status: { in: ['PENDING', 'PROCESSING'] },
          createdAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          ...(shippingMethod ? { shipment: { shippingMethod: shippingMethod as any } } : {}),
        },
        include: {
          shipment: {
            select: {
              shipmentId: true,
              destinationCity: true,
              destinationCountry: true,
            },
          },
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
    ]);

    // ─── Process results ───

    // Revenue summary
    const totalRevenue = currentRevenue._sum.amount || 0;
    const prevTotalRevenue = previousRevenue._sum.amount || 0;
    const revenueGrowth = prevTotalRevenue > 0
      ? Math.round(((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 * 10) / 10
      : 0;

    const outstandingAmount = outstandingPayments._sum.amount || 0;
    const outstandingCount = outstandingPayments._count;
    const avgOrderValue = avgOrderValueResult._avg.amount || 0;

    // Revenue by shipping method
    const methodRevenueMap = new Map<string, number>();
    revenueByMethodData.forEach((p: any) => {
      const method = p.shipment?.shippingMethod || 'UNKNOWN';
      methodRevenueMap.set(method, (methodRevenueMap.get(method) || 0) + p.amount);
    });
    const revenueByMethod = Array.from(methodRevenueMap.entries()).map(([method, revenue]) => ({
      method,
      revenue: Math.round(revenue * 100) / 100,
    }));

    // Revenue by route
    const routeRevenueMap = new Map<string, { revenue: number; routeName: string; count: number }>();
    revenueByRouteRaw.forEach((p: any) => {
      const routeId = p.shipment?.routeId || 'no-route';
      const entry = routeRevenueMap.get(routeId) || {
        revenue: 0,
        routeName: p.shipment?.route?.name || 'No Route',
        count: 0,
      };
      entry.revenue += p.amount;
      entry.count += 1;
      routeRevenueMap.set(routeId, entry);
    });
    const revenueByRoute = Array.from(routeRevenueMap.entries())
      .map(([, val]) => ({
        route: val.routeName,
        revenue: Math.round(val.revenue * 100) / 100,
        shipmentCount: val.count,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Payment status distribution
    const paymentStatusDist = paymentsByStatusData.map((s: any) => ({
      status: s.status,
      count: s._count.status,
      amount: Math.round((s._sum.amount || 0) * 100) / 100,
    }));

    // Monthly revenue chart data
    const monthRevMap = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthRevMap.set(key, 0);
    }
    monthlyRevenueData.forEach((p: any) => {
      const key = p.createdAt.toISOString().slice(0, 7);
      if (monthRevMap.has(key)) {
        monthRevMap.set(key, (monthRevMap.get(key) || 0) + p.amount);
      }
    });
    const monthlyRevenue = Array.from(monthRevMap.entries()).map(([month, revenue]) => ({
      month,
      revenue: Math.round(revenue * 100) / 100,
    }));

    // Daily revenue chart data
    const dailyRevMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyRevMap.set(key, 0);
    }
    dailyRevenueData.forEach((p: any) => {
      const key = p.createdAt.toISOString().split('T')[0];
      if (dailyRevMap.has(key)) {
        dailyRevMap.set(key, (dailyRevMap.get(key) || 0) + p.amount);
      }
    });
    const dailyRevenue = Array.from(dailyRevMap.entries()).map(([date, revenue]) => ({
      date,
      revenue: Math.round(revenue * 100) / 100,
    }));

    // Top customers by spending
    const customerSpendMap = new Map<string, { name: string; email: string; company: string; totalSpent: number; paymentCount: number }>();
    topCustomersRaw.forEach((p: any) => {
      const uid = p.userId;
      const entry = customerSpendMap.get(uid) || {
        name: p.user?.name || 'Unknown',
        email: p.user?.email || '',
        company: p.user?.company || '',
        totalSpent: 0,
        paymentCount: 0,
      };
      entry.totalSpent += p.amount;
      entry.paymentCount += 1;
      customerSpendMap.set(uid, entry);
    });
    const topCustomers = Array.from(customerSpendMap.entries())
      .map(([, val]) => ({
        ...val,
        totalSpent: Math.round(val.totalSpent * 100) / 100,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Aging report: group overdue payments by age buckets
    const agingBuckets = {
      '1-30 days': { count: 0, amount: 0 },
      '31-60 days': { count: 0, amount: 0 },
      '61-90 days': { count: 0, amount: 0 },
      '90+ days': { count: 0, amount: 0 },
    };
    const overdueList = overduePayments.map((p: any) => {
      const daysOverdue = Math.floor((now.getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: p.id,
        paymentId: p.paymentId,
        amount: p.amount,
        status: p.status,
        customer: p.user?.name || 'Unknown',
        customerEmail: p.user?.email || '',
        destination: p.shipment ? `${p.shipment.destinationCity}, ${p.shipment.destinationCountry}` : 'N/A',
        createdAt: p.createdAt.toISOString(),
        daysOverdue,
      };
    });
    overdueList.forEach((p) => {
      if (p.daysOverdue <= 30) {
        agingBuckets['1-30 days'].count += 1;
        agingBuckets['1-30 days'].amount += p.amount;
      } else if (p.daysOverdue <= 60) {
        agingBuckets['31-60 days'].count += 1;
        agingBuckets['31-60 days'].amount += p.amount;
      } else if (p.daysOverdue <= 90) {
        agingBuckets['61-90 days'].count += 1;
        agingBuckets['61-90 days'].amount += p.amount;
      } else {
        agingBuckets['90+ days'].count += 1;
        agingBuckets['90+ days'].amount += p.amount;
      }
    });

    // Format recent payments
    const formattedRecentPayments = recentPayments.map((p: any) => ({
      id: p.id,
      paymentId: p.paymentId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      method: p.method,
      customer: p.user?.name || 'Unknown',
      customerEmail: p.user?.email || '',
      shipmentId: p.shipment?.shipmentId || '',
      destination: p.shipment ? `${p.shipment.destinationCity}, ${p.shipment.destinationCountry}` : 'N/A',
      shippingMethod: p.shipment?.shippingMethod || '',
      paidAt: p.paidAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        // Summary stats
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        previousRevenue: Math.round(prevTotalRevenue * 100) / 100,
        revenueGrowth,
        outstandingPayments: {
          amount: Math.round(outstandingAmount * 100) / 100,
          count: outstandingCount,
        },
        averageOrderValue: Math.round(avgOrderValue * 100) / 100,
        currentShipmentCount,
        previousShipmentCount,
        shipmentGrowth: previousShipmentCount > 0
          ? Math.round(((currentShipmentCount - previousShipmentCount) / previousShipmentCount) * 100 * 10) / 10
          : 0,

        // Revenue breakdowns
        revenueByMethod,
        revenueByRoute,

        // Chart data
        monthlyRevenue,
        dailyRevenue,
        paymentStatusDistribution: paymentStatusDist,

        // Top customers
        topCustomers,

        // Tables
        recentPayments: formattedRecentPayments,
        topRoutes: revenueByRoute,

        // Aging
        agingReport: {
          buckets: Object.entries(agingBuckets).map(([range, val]) => ({
            range,
            count: val.count,
            amount: Math.round(val.amount * 100) / 100,
          })),
          overduePayments: overdueList,
        },
      },
    });
  } catch (error: any) {
    console.error('Finance API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
