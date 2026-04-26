import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;

    const { id } = await params;
    const photos = await db.shipmentPhoto.findMany({
      where: { shipmentId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: photos });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN', 'WAREHOUSE_STAFF'] });
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;
    const body = await request.json();
    const { photoUrl, description } = body;

    if (!photoUrl) {
      return NextResponse.json({ success: false, error: 'Photo URL is required' }, { status: 400 });
    }

    const photo = await db.shipmentPhoto.create({
      data: {
        shipmentId: id,
        photoUrl,
        description: description || null,
        uploadedBy: session.id,
      },
    });

    await createAuditLog({
      userId: session.id,
      action: 'CREATE',
      entity: 'ShipmentPhoto',
      entityId: photo.id,
      details: JSON.stringify({ shipmentId: id }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: photo });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
