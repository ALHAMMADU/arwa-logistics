import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

export async function GET(request: Request) {
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const access = checkAccess(request, { roles: ['ADMIN'] });
  if (!access.allowed) return access.response;

  try {
    // Average processing time (CREATED -> DISPATCHED)
    const dispatchedShipments = await db.shipment.findMany({
      where: {
        status: {
          in: ['DISPATCHED', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION', 'CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY', 'DELIVERED'],
        },
      },
      select: { id: true, createdAt: true },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    const processingTimes: number[] = [];
    for (const shipment of dispatchedShipments) {
      const firstDispatch = await db.shipmentTracking.findFirst({
        where: { shipmentId: shipment.id, status: { in: ['DISPATCHED', 'IN_TRANSIT'] } },
        orderBy: { timestamp: 'asc' },
      });
      if (firstDispatch) {
        const hours = (firstDispatch.timestamp.getTime() - shipment.createdAt.getTime()) / (1000 * 60 * 60);
        processingTimes.push(hours);
      }
    }

    const avgProcessingHours = processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 0;

    // Delivery success rate
    const [totalDelivered, totalFailed] = await Promise.all([
      db.shipment.count({ where: { status: 'DELIVERED' } }),
      db.shipment.count({ where: { active: false, status: { notIn: ['DELIVERED'] } } }),
    ]);

    const deliverySuccessRate = totalDelivered + totalFailed > 0
      ? Math.round((totalDelivered / (totalDelivered + totalFailed)) * 100)
      : 100;

    // On-time delivery rate (delivered before or on estimated date)
    // Since Prisma doesn't support field comparison in where clause,
    // we fetch delivered shipments with both dates and filter in JS
    const deliveredWithDates = await db.shipment.findMany({
      where: {
        status: 'DELIVERED',
        actualDelivery: { not: null },
        estimatedDelivery: { not: null },
      },
      select: { actualDelivery: true, estimatedDelivery: true },
    });

    const onTimeDeliveries = deliveredWithDates.filter(s => {
      if (s.actualDelivery && s.estimatedDelivery) {
        return new Date(s.actualDelivery) <= new Date(s.estimatedDelivery);
      }
      return false;
    }).length;

    const onTimeRate = deliveredWithDates.length > 0
      ? Math.round((onTimeDeliveries / deliveredWithDates.length) * 100)
      : 100;

    // Active shipments by status (funnel)
    const statusFunnel = await db.shipment.groupBy({
      by: ['status'],
      _count: { status: true },
      where: { active: true },
      orderBy: { _count: { status: 'desc' } },
    });

    // Customer satisfaction (based on ticket resolution)
    const ticketStats = await db.supportTicket.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        avgProcessingHours: Math.round(avgProcessingHours * 10) / 10,
        deliverySuccessRate,
        onTimeDeliveries,
        onTimeRate,
        totalDeliveredWithDates: deliveredWithDates.length,
        statusFunnel: statusFunnel.map(s => ({ status: s.status, count: s._count.status })),
        ticketStats: ticketStats.map(t => ({ status: t.status, count: t._count.status })),
        totalShipmentsAnalyzed: dispatchedShipments.length,
      },
    });
  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
