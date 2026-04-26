import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';
import { sendShipmentStatusEmail } from '@/lib/email';
import { sseEmitter } from '@/lib/event-emitter';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    // ADMIN or WAREHOUSE_STAFF only
    const access = checkAccess(request, { roles: ['ADMIN', 'WAREHOUSE_STAFF'] });
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;
    const body = await request.json();
    const { status, location, notes } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: 'Status is required' }, { status: 400 });
    }

    // Valid status transitions
    const validStatuses = [
      'CREATED', 'WAITING_WAREHOUSE_ARRIVAL', 'RECEIVED_AT_WAREHOUSE', 'PROCESSING',
      'READY_FOR_DISPATCH', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION',
      'CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY', 'DELIVERED'
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    // Get shipment with customer info before update (for email)
    const existingShipment = await db.shipment.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, email: true } },
      },
    });

    // Update shipment status
    const shipment = await db.shipment.update({
      where: { id },
      data: {
        status,
        ...(status === 'DELIVERED' ? { actualDelivery: new Date() } : {}),
      },
    });

    // Create tracking event
    await db.shipmentTracking.create({
      data: {
        shipmentId: id,
        status,
        location: location || 'System Update',
        notes: notes || `Status updated to ${status}`,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.id,
      action: 'STATUS_CHANGE',
      entity: 'Shipment',
      entityId: id,
      details: JSON.stringify({ from: shipment.status, to: status }),
      ipAddress: getClientIp(request),
    });

    // Emit SSE event for real-time updates
    sseEmitter.emit('shipment_status_update', {
      shipmentId: id,
      newStatus: status,
      updatedBy: session.id,
      timestamp: new Date().toISOString(),
      customerId: existingShipment?.customerId,
      shipmentTrackingId: existingShipment?.shipmentId,
    });

    // Send email notification (non-blocking)
    if (existingShipment?.customer) {
      sendShipmentStatusEmail(
        existingShipment.customer.email,
        existingShipment.customer.name,
        existingShipment.shipmentId,
        existingShipment.trackingNumber,
        status,
        location || 'System Update'
      );

      // Create in-app notification for the customer
      try {
        const statusLabels: Record<string, string> = {
          CREATED: 'Created',
          WAITING_WAREHOUSE_ARRIVAL: 'Waiting for Warehouse',
          RECEIVED_AT_WAREHOUSE: 'Received at Warehouse',
          PROCESSING: 'Processing',
          READY_FOR_DISPATCH: 'Ready for Dispatch',
          DISPATCHED: 'Dispatched',
          IN_TRANSIT: 'In Transit',
          ARRIVED_AT_DESTINATION: 'Arrived at Destination',
          CUSTOMS_CLEARANCE: 'Customs Clearance',
          OUT_FOR_DELIVERY: 'Out for Delivery',
          DELIVERED: 'Delivered',
        };

        const notification = await db.notification.create({
          data: {
            userId: existingShipment.customerId,
            title: `Shipment ${statusLabels[status] || status}`,
            message: `Your shipment ${existingShipment.shipmentId} has been updated to: ${statusLabels[status] || status}${location ? ` at ${location}` : ''}`,
            type: status === 'DELIVERED' ? 'SUCCESS' : 'SHIPMENT_UPDATE',
            link: `shipment-detail`,
          },
        });

        // Emit SSE notification event for the customer
        sseEmitter.emit('new_notification', {
          userId: existingShipment.customerId,
          notificationId: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          timestamp: new Date().toISOString(),
        });
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }
    }

    const updated = await db.shipment.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, email: true } },
        warehouse: { select: { name: true, city: true } },
        route: { select: { name: true } },
        trackingEvents: { orderBy: { timestamp: 'desc' } },
        photos: { orderBy: { createdAt: 'desc' } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
