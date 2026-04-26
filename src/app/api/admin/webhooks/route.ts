import { NextResponse } from 'next/server';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function GET(request: Request) {
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const access = checkAccess(request, { roles: ['ADMIN'] });
  if (!access.allowed) return access.response;

  const endpoints = await db.webhookEndpoint.findMany({
    include: {
      _count: { select: { deliveries: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, data: endpoints });
}

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const access = checkAccess(request, { roles: ['ADMIN'] });
  if (!access.allowed) return access.response;

  try {
    const body = await request.json();
    const { name, url, events } = body;

    if (!name || !url || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { success: false, error: 'Name, URL, and events array are required' },
        { status: 400 }
      );
    }

    const secret = crypto.randomBytes(32).toString('hex');

    const endpoint = await db.webhookEndpoint.create({
      data: {
        name,
        url,
        secret,
        events: JSON.stringify(events),
      },
    });

    await createAuditLog({
      userId: access.session.id,
      action: 'CREATE',
      entity: 'WebhookEndpoint',
      entityId: endpoint.id,
      details: JSON.stringify({ name, url, events }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: endpoint }, { status: 201 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
