import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

// GET: List email logs (ADMIN only)
export async function GET(request: Request) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const emailType = searchParams.get('emailType') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (emailType) where.emailType = emailType;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { to: { contains: search } },
        { subject: { contains: search } },
        { entityId: { contains: search } },
      ];
    }

    const [emails, total] = await Promise.all([
      db.emailLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          to: true,
          subject: true,
          emailType: true,
          status: true,
          entityType: true,
          entityId: true,
          error: true,
          sentAt: true,
          createdAt: true,
        },
      }),
      db.emailLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Send test email (ADMIN only)
export async function POST(request: Request) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;

    const body = await request.json();
    const { type, to } = body;

    if (!to) {
      return NextResponse.json({ success: false, error: 'Recipient email is required' }, { status: 400 });
    }

    const { sendWelcomeEmail, sendShipmentCreatedEmail, sendStatusUpdateEmail, sendShipmentDeliveredEmail, sendPasswordChangeEmail, sendInvoiceEmail } = await import('@/lib/email');

    switch (type || 'welcome') {
      case 'welcome':
        await sendWelcomeEmail(to, 'Test User');
        break;
      case 'shipment_created':
        await sendShipmentCreatedEmail(to, 'Test User', 'ARWA-2026-TEST', 'ARWA-TRACK-TEST', 'Riyadh, Saudi Arabia');
        break;
      case 'status_update':
        await sendStatusUpdateEmail(to, 'Test User', 'ARWA-2026-TEST', 'ARWA-TRACK-TEST', 'IN_TRANSIT', 'Shanghai, China');
        break;
      case 'delivered':
        await sendShipmentDeliveredEmail(to, 'Test User', 'ARWA-2026-TEST', 'ARWA-TRACK-TEST');
        break;
      case 'password_change':
        await sendPasswordChangeEmail(to, 'Test User');
        break;
      case 'invoice':
        await sendInvoiceEmail(to, 'Test User', 'ARWA-2026-TEST', 'INV-2026-001', '$1,250.00');
        break;
      default:
        await sendWelcomeEmail(to, 'Test User');
    }

    return NextResponse.json({ success: true, message: `Test email of type "${type || 'welcome'}" sent to ${to}` });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
