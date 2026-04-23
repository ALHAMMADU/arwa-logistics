import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAccess, rateLimit } from '@/lib/rbac';

// GET /api/tickets/[id] - Get ticket detail
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;
    const { id } = await params;

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        assignee: { select: { id: true, name: true, email: true } },
        shipment: { select: { id: true, shipmentId: true, trackingNumber: true, status: true } },
        messages: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    // Customers can only see their own tickets
    if (session.role === 'CUSTOMER' && ticket.customerId !== session.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Filter out internal messages for customers
    if (session.role === 'CUSTOMER') {
      ticket.messages = ticket.messages.filter((m: any) => !m.isInternal);
    }

    return NextResponse.json({ success: true, data: ticket });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
