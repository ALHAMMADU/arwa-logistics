import { NextResponse } from 'next/server';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';
import { db } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const access = checkAccess(request, { roles: ['ADMIN'] });
  if (!access.allowed) return access.response;

  const endpoint = await db.webhookEndpoint.findUnique({
    where: { id },
    include: {
      deliveries: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  if (!endpoint) {
    return NextResponse.json({ success: false, error: 'Webhook endpoint not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: endpoint });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const access = checkAccess(request, { roles: ['ADMIN'] });
  if (!access.allowed) return access.response;

  try {
    const body = await request.json();
    const updateData: Record<string, any> = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.events !== undefined) updateData.events = JSON.stringify(body.events);
    if (body.active !== undefined) updateData.active = body.active;

    const endpoint = await db.webhookEndpoint.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      userId: access.session.id,
      action: 'UPDATE',
      entity: 'WebhookEndpoint',
      entityId: endpoint.id,
      details: JSON.stringify(updateData),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: endpoint });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const access = checkAccess(request, { roles: ['ADMIN'] });
  if (!access.allowed) return access.response;

  await db.webhookEndpoint.delete({ where: { id } });

  await createAuditLog({
    userId: access.session.id,
    action: 'DELETE',
    entity: 'WebhookEndpoint',
    entityId: id,
    details: JSON.stringify({ id }),
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true, message: 'Webhook endpoint deleted' });
}
