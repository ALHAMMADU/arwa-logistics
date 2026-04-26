import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    // Any authenticated user (ownership check below)
    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;
    const shipment = await db.shipment.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, company: true } },
        warehouse: { select: { id: true, name: true, city: true, address: true } },
        route: true,
        trackingEvents: { orderBy: { timestamp: 'desc' } },
        photos: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!shipment) {
      return NextResponse.json({ success: false, error: 'Shipment not found' }, { status: 404 });
    }

    // Customers can only see their own shipments
    if (session.role === 'CUSTOMER' && shipment.customerId !== session.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: shipment });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    // Any authenticated user (ownership check below)
    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;
    const body = await request.json();

    const shipment = await db.shipment.findUnique({ where: { id } });
    if (!shipment) {
      return NextResponse.json({ success: false, error: 'Shipment not found' }, { status: 404 });
    }

    // Ownership check: only owner or ADMIN can update
    if (session.role === 'CUSTOMER' && shipment.customerId !== session.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const allowedFields = session.role === 'ADMIN'
      ? ['senderName', 'senderPhone', 'receiverName', 'receiverPhone', 'receiverAddress', 'destinationCountry', 'destinationCity', 'weight', 'length', 'width', 'height', 'productDescription', 'shipmentValue', 'shippingMethod', 'shipmentType', 'status', 'warehouseId', 'routeId', 'notes', 'estimatedDelivery', 'actualDelivery']
      : session.role === 'WAREHOUSE_STAFF'
        ? ['status', 'warehouseId', 'notes']
        : [];

    const updateData: any = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await db.shipment.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      userId: session.id,
      action: 'UPDATE',
      entity: 'Shipment',
      entityId: id,
      details: JSON.stringify(updateData),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
