import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';

export async function GET(request: Request, { params }: { params: Promise<{ trackingNumber: string }> }) {
  const rateLimitResult = rateLimit(request, { windowMs: 60 * 1000, maxRequests: 30 });
  if (rateLimitResult) return rateLimitResult;

  try {
    const { trackingNumber } = await params;

    const shipment = await db.shipment.findUnique({
      where: { trackingNumber },
      include: {
        customer: { select: { name: true, company: true } },
        warehouse: { select: { name: true, city: true } },
        route: { select: { name: true, estimatedDaysMin: true, estimatedDaysMax: true } },
        trackingEvents: { orderBy: { timestamp: 'desc' } },
        photos: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!shipment) {
      return NextResponse.json({ success: false, error: 'Tracking number not found' }, { status: 404 });
    }

    // Check if user is authenticated - if so, they get full data
    const access = checkAccess(request);

    if (access.allowed) {
      // Authenticated users get full details
      // Customers can only see their own shipments
      if (access.session.role === 'CUSTOMER' && shipment.customerId !== access.session.id) {
        // Still allow tracking but with limited data
        const publicData = {
          shipmentId: shipment.shipmentId,
          trackingNumber: shipment.trackingNumber,
          status: shipment.status,
          destinationCountry: shipment.destinationCountry,
          destinationCity: shipment.destinationCity,
          shippingMethod: shipment.shippingMethod,
          shipmentType: shipment.shipmentType,
          trackingEvents: shipment.trackingEvents,
          estimatedDelivery: shipment.estimatedDelivery,
          createdAt: shipment.createdAt,
        };
        return NextResponse.json({ success: true, data: publicData });
      }

      // Log the tracking view
      await createAuditLog({
        userId: access.session.id,
        action: 'SCAN',
        entity: 'Shipment',
        entityId: shipment.id,
        details: JSON.stringify({ trackingNumber, action: 'track_view' }),
        ipAddress: getClientIp(request),
      });

      return NextResponse.json({ success: true, data: shipment });
    }

    // Unauthenticated (public) - return limited tracking data only
    const publicData = {
      shipmentId: shipment.shipmentId,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      destinationCountry: shipment.destinationCountry,
      destinationCity: shipment.destinationCity,
      shippingMethod: shipment.shippingMethod,
      shipmentType: shipment.shipmentType,
      trackingEvents: shipment.trackingEvents.map((e: any) => ({
        status: e.status,
        location: e.location,
        timestamp: e.timestamp,
        notes: e.notes,
      })),
      estimatedDelivery: shipment.estimatedDelivery,
      createdAt: shipment.createdAt,
    };
    return NextResponse.json({ success: true, data: publicData });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
