import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAccess, rateLimit, createAuditLog, getClientIp } from '@/lib/rbac';

// PUT /api/tickets/[id]/assign - Assign ticket to admin
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

    // Only admins can assign tickets
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    const body = await request.json();
    const { assignedTo } = body;

    // Verify assignee is an admin
    if (assignedTo) {
      const assignee = await db.user.findUnique({
        where: { id: assignedTo },
        select: { id: true, name: true, role: true, active: true },
      });
      if (!assignee || assignee.role !== 'ADMIN' || !assignee.active) {
        return NextResponse.json(
          { success: false, error: 'Invalid assignee. Must be an active admin.' },
          { status: 400 }
        );
      }
    }

    const updated = await db.supportTicket.update({
      where: { id },
      data: { assignedTo: assignedTo || null },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    // Notify assigned admin
    if (assignedTo) {
      await db.notification.create({
        data: {
          userId: assignedTo,
          title: 'Ticket Assigned',
          message: `Ticket ${ticket.ticketId}: ${ticket.subject} has been assigned to you`,
          type: 'INFO',
        },
      });
    }

    // Audit log
    await createAuditLog({
      userId: session.id,
      action: 'UPDATE',
      entity: 'SupportTicket',
      entityId: id,
      details: JSON.stringify({ ticketId: ticket.ticketId, assignedTo }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
