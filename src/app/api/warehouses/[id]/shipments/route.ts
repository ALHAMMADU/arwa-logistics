import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN', 'WAREHOUSE_STAFF'] });
    if (!access.allowed) return access.response;

    const { id } = await params;
    const shipments = await db.shipment.findMany({
      where: { warehouseId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, email: true } },
        trackingEvents: { orderBy: { timestamp: 'desc' }, take: 1 },
      },
    });

    return NextResponse.json({ success: true, data: shipments });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
