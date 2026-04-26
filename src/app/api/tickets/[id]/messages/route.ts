import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAccess, rateLimit, createAuditLog, getClientIp } from '@/lib/rbac';

// POST /api/tickets/[id]/messages - Add message to ticket
export async function POST(
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

    // Customers can only add messages to their own tickets
    if (session.role === 'CUSTOMER' && ticket.customerId !== session.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { message, isInternal } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    // Only admins/warehouse staff can add internal notes
    const internalFlag = isInternal && session.role !== 'CUSTOMER';

    const ticketMessage = await db.ticketMessage.create({
      data: {
        ticketId: id,
        userId: session.id,
        message: message.trim(),
        isInternal: internalFlag,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    // Update ticket status if it was waiting for customer
    if (session.role === 'CUSTOMER' && ticket.status === 'WAITING_CUSTOMER') {
      await db.supportTicket.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Notify customer if admin replied (non-internal)
    if (session.role !== 'CUSTOMER' && !internalFlag) {
      await db.notification.create({
        data: {
          userId: ticket.customerId,
          title: 'Ticket Update',
          message: `Update on ticket ${ticket.ticketId}: ${ticket.subject}`,
          type: 'INFO',
        },
      });
    }

    // Notify assigned admin if customer replied
    if (session.role === 'CUSTOMER' && ticket.assignedTo) {
      await db.notification.create({
        data: {
          userId: ticket.assignedTo,
          title: 'Customer Reply',
          message: `Customer replied on ticket ${ticket.ticketId}`,
          type: 'INFO',
        },
      });
    }

    // Audit log
    await createAuditLog({
      userId: session.id,
      action: 'CREATE',
      entity: 'TicketMessage',
      entityId: ticketMessage.id,
      details: JSON.stringify({ ticketId: ticket.ticketId, isInternal: internalFlag }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: ticketMessage }, { status: 201 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
