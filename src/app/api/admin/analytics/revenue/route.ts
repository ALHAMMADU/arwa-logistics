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

    // Daily revenue for the last 30 days
    const dailyRevenue = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const result = await db.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED', paidAt: { gte: dayStart, lt: dayEnd } },
      });

      dailyRevenue.push({
        date: dayStart.toISOString().substring(0, 10),
        revenue: result._sum.amount || 0,
      });
    }

    // Revenue by destination
    const revenueByDestination = await db.payment.findMany({
      where: { status: 'COMPLETED' },
      include: {
        shipment: { select: { destinationCountry: true, destinationCity: true, shippingMethod: true } },
      },
    });

    const destinationMap = new Map<string, { country: string; city: string; revenue: number; count: number }>();
    for (const payment of revenueByDestination) {
      const key = `${payment.shipment.destinationCountry}-${payment.shipment.destinationCity}`;
      const existing = destinationMap.get(key) || {
        country: payment.shipment.destinationCountry,
        city: payment.shipment.destinationCity,
        revenue: 0,
        count: 0,
      };
      existing.revenue += payment.amount;
      existing.count++;
      destinationMap.set(key, existing);
    }

    return NextResponse.json({
      success: true,
      data: {
        dailyRevenue,
        revenueByDestination: Array.from(destinationMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 20),
        totalCompleted: revenueByDestination.length,
        totalRevenue: revenueByDestination.reduce((sum, p) => sum + p.amount, 0),
      },
    });
  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
