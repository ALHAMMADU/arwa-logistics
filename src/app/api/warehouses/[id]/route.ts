import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;

    const { id } = await params;
    const warehouse = await db.warehouse.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, email: true, phone: true } },
        _count: { select: { shipments: true } },
      },
    });

    if (!warehouse) {
      return NextResponse.json({ success: false, error: 'Warehouse not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: warehouse });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;

    const { id } = await params;
    const body = await request.json();

    const warehouse = await db.warehouse.update({
      where: { id },
      data: body,
    });

    await createAuditLog({
      userId: access.session.id,
      action: 'UPDATE',
      entity: 'Warehouse',
      entityId: id,
      details: JSON.stringify(body),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: warehouse });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
