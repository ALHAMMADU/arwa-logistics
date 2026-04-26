import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { id } = await params;
    const route = await db.shippingRoute.findUnique({ where: { id } });
    if (!route) {
      return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: route });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;

    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, any> = {};
    const allowedFields = ['name', 'originCountry', 'destinationCountry', 'destinationCity', 'pricePerKg', 'estimatedDaysMin', 'estimatedDaysMax', 'allowedAir', 'allowedSea', 'allowedLand', 'active'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'pricePerKg') {
          updateData[field] = parseFloat(body[field]);
        } else if (field === 'estimatedDaysMin' || field === 'estimatedDaysMax') {
          updateData[field] = parseInt(body[field], 10);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const route = await db.shippingRoute.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      userId: access.session.id,
      action: 'UPDATE',
      entity: 'ShippingRoute',
      entityId: id,
      details: JSON.stringify(updateData),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: route });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;

    const { id } = await params;
    await db.shippingRoute.update({
      where: { id },
      data: { active: false },
    });

    await createAuditLog({
      userId: access.session.id,
      action: 'DELETE',
      entity: 'ShippingRoute',
      entityId: id,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
