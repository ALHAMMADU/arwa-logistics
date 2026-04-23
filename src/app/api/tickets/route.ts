import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAccess, rateLimit, createAuditLog, getClientIp } from '@/lib/rbac';

// Ticket ID counter (in-memory, reset on restart)
let ticketCounter = 0;
async function getNextTicketId(): Promise<string> {
  if (ticketCounter === 0) {
    const last = await db.supportTicket.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { ticketId: true },
    });
    if (last) {
      const num = parseInt(last.ticketId.split('-').pop() || '0');
      ticketCounter = num;
    }
  }
  ticketCounter++;
  return `TK-2026-${String(ticketCounter).padStart(6, '0')}`;
}

// GET /api/tickets - List tickets
export async function GET(request: Request) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};

    // Customers can only see their own tickets
    if (session.role === 'CUSTOMER') {
      where.customerId = session.id;
    }

    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { ticketId: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [tickets, total] = await Promise.all([
      db.supportTicket.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true } },
          shipment: { select: { id: true, shipmentId: true, trackingNumber: true } },
          messages: { take: 1, orderBy: { createdAt: 'desc' }, select: { createdAt: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.supportTicket.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: tickets,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tickets - Create ticket
export async function POST(request: Request) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const body = await request.json();
    const { subject, description, category, priority, shipmentId } = body;

    if (!subject || !description) {
      return NextResponse.json(
        { success: false, error: 'Subject and description are required' },
        { status: 400 }
      );
    }

    const validCategories = ['GENERAL', 'SHIPMENT_ISSUE', 'BILLING', 'CUSTOMS', 'DAMAGE', 'DELIVERY', 'OTHER'];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

    const ticketData: any = {
      ticketId: await getNextTicketId(),
      subject,
      description,
      category: validCategories.includes(category) ? category : 'GENERAL',
      priority: validPriorities.includes(priority) ? priority : 'MEDIUM',
      customerId: session.id,
    };

    if (shipmentId) {
      // Verify shipment belongs to user (or user is admin)
      const shipment = await db.shipment.findFirst({
        where: { id: shipmentId, ...(session.role === 'CUSTOMER' ? { customerId: session.id } : {}) },
      });
      if (shipment) {
        ticketData.shipmentId = shipmentId;
      }
    }

    const ticket = await db.supportTicket.create({
      data: ticketData,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    // Create first message (the description)
    await db.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: session.id,
        message: description,
      },
    });

    // Create notification for admins
    const admins = await db.user.findMany({
      where: { role: 'ADMIN', active: true },
      select: { id: true },
    });
    await db.notification.createMany({
      data: admins.map(admin => ({
        userId: admin.id,
        title: 'New Support Ticket',
        message: `Ticket ${ticket.ticketId}: ${subject}`,
        type: 'INFO',
        link: 'admin-tickets',
      })),
    });

    // Audit log
    await createAuditLog({
      userId: session.id,
      action: 'CREATE',
      entity: 'SupportTicket',
      entityId: ticket.id,
      details: JSON.stringify({ ticketId: ticket.ticketId, subject }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
