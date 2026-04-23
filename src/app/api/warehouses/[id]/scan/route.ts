import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN', 'WAREHOUSE_STAFF'] });
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;
    const body = await request.json();
    const { shipmentId, action } = body;

    if (!shipmentId || !action) {
      return NextResponse.json({ success: false, error: 'shipmentId and action are required' }, { status: 400 });
    }

    // Verify warehouse exists
    const warehouse = await db.warehouse.findUnique({ where: { id } });
    if (!warehouse) {
      return NextResponse.json({ success: false, error: 'Warehouse not found' }, { status: 404 });
    }

    // Find the shipment
    let shipment = await db.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) {
      // Try by tracking number
      shipment = await db.shipment.findUnique({ where: { trackingNumber: shipmentId } });
    }
    if (!shipment) {
      // Try by shipmentId field
      shipment = await db.shipment.findUnique({ where: { shipmentId: shipmentId } });
    }

    if (!shipment) {
      return NextResponse.json({ success: false, error: 'Shipment not found' }, { status: 404 });
    }

    let newStatus: string;
    let location = warehouse.name;

    switch (action) {
      case 'receive':
        newStatus = 'RECEIVED_AT_WAREHOUSE';
        break;
      case 'process':
        newStatus = 'PROCESSING';
        break;
      case 'ready':
        newStatus = 'READY_FOR_DISPATCH';
        break;
      case 'dispatch':
        newStatus = 'DISPATCHED';
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid action. Use: receive, process, ready, dispatch' }, { status: 400 });
    }

    // Update shipment
    await db.shipment.update({
      where: { id: shipment.id },
      data: {
        status: newStatus as any,
        warehouseId: id,
      },
    });

    // Create tracking event
    await db.shipmentTracking.create({
      data: {
        shipmentId: shipment.id,
        status: newStatus as any,
        location,
        notes: `Action: ${action} at ${warehouse.name}`,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.id,
      action: 'SCAN',
      entity: 'Shipment',
      entityId: shipment.id,
      details: JSON.stringify({ action, warehouse: warehouse.name }),
      ipAddress: getClientIp(request),
    });

    const updated = await db.shipment.findUnique({
      where: { id: shipment.id },
      include: {
        customer: { select: { name: true, email: true } },
        warehouse: { select: { name: true, city: true } },
        trackingEvents: { orderBy: { timestamp: 'desc' } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
