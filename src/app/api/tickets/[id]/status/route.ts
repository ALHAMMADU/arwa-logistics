import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAccess, rateLimit, createAuditLog, getClientIp } from '@/lib/rbac';

// PUT /api/tickets/[id]/status - Update ticket status
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;
    const { id } = await params;

    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, resolution } = body;

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    // Customers can only close their own tickets
    if (session.role === 'CUSTOMER') {
      if (status !== 'CLOSED') {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
      if (ticket.customerId !== session.id) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    // Resolution is required when resolving (but optional for customers closing their own ticket)
    if (status === 'RESOLVED' && !resolution?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Resolution is required when resolving a ticket' },
        { status: 400 }
      );
    }

    const updateData: any = { status };
    if (resolution?.trim()) {
      updateData.resolution = resolution.trim();
    }

    const updated = await db.supportTicket.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    // Notify customer
    await db.notification.create({
      data: {
        userId: ticket.customerId,
        title: 'Ticket Status Updated',
        message: `Ticket ${ticket.ticketId} status changed to ${status}`,
        type: status === 'RESOLVED' ? 'SUCCESS' : 'INFO',
      },
    });

    // Add status change message
    await db.ticketMessage.create({
      data: {
        ticketId: id,
        userId: session.id,
        message: `Status changed to ${status}${resolution ? `. Resolution: ${resolution}` : ''}`,
        isInternal: false,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.id,
      action: 'STATUS_CHANGE',
      entity: 'SupportTicket',
      entityId: id,
      details: JSON.stringify({ ticketId: ticket.ticketId, oldStatus: ticket.status, newStatus: status }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
