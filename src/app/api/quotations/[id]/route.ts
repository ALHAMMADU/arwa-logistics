import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';

// GET: Get quotation details
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;

    const quotation = await db.quotation.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, company: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
        { status: 404 }
      );
    }

    // Customers can only see their own quotations
    if (session.role === 'CUSTOMER' && quotation.customerId !== session.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: quotation });
  } catch (error: any) {
    console.error('Quotation detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update quotation
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;
    const body = await request.json();

    const quotation = await db.quotation.findUnique({ where: { id } });
    if (!quotation) {
      return NextResponse.json(
        { success: false, error: 'Quotation not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (session.role === 'ADMIN') {
      // Admin actions: set price, estimated days, valid until, change status, add notes
      const { quotedPrice, estimatedDays, validUntil, status, notes, reviewedById } = body;

      if (quotedPrice !== undefined) updateData.quotedPrice = parseFloat(quotedPrice);
      if (estimatedDays !== undefined) updateData.estimatedDays = parseInt(estimatedDays);
      if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
      if (notes !== undefined) updateData.notes = notes;

      if (status) {
        const validTransitions: Record<string, string[]> = {
          PENDING: ['REVIEWED', 'QUOTED', 'EXPIRED'],
          REVIEWED: ['QUOTED', 'EXPIRED'],
          QUOTED: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
          ACCEPTED: [],
          REJECTED: [],
          EXPIRED: [],
        };

        if (!validTransitions[quotation.status]?.includes(status)) {
          return NextResponse.json(
            { success: false, error: `Cannot transition from ${quotation.status} to ${status}` },
            { status: 400 }
          );
        }

        updateData.status = status;

        if (status === 'REVIEWED' || status === 'QUOTED') {
          updateData.reviewedById = session.id;
          updateData.reviewedAt = new Date();
        }
      }
    } else {
      // Customer actions: accept or reject
      const { status } = body;

      if (!status) {
        return NextResponse.json(
          { success: false, error: 'Status is required' },
          { status: 400 }
        );
      }

      // Customers can only modify their own quotations
      if (quotation.customerId !== session.id) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Customers can only accept or reject QUOTED quotations
      if (quotation.status !== 'QUOTED') {
        return NextResponse.json(
          { success: false, error: 'Only quoted quotations can be accepted or rejected' },
          { status: 400 }
        );
      }

      if (status !== 'ACCEPTED' && status !== 'REJECTED') {
        return NextResponse.json(
          { success: false, error: 'Customers can only accept or reject quotations' },
          { status: 400 }
        );
      }

      updateData.status = status;
    }

    const updatedQuotation = await db.quotation.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, company: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      userId: session.id,
      action: 'UPDATE',
      entity: 'Quotation',
      entityId: id,
      details: JSON.stringify({
        quotationId: quotation.quotationId,
        from: quotation.status,
        to: updateData.status || quotation.status,
        updatedFields: Object.keys(updateData),
      }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: updatedQuotation });
  } catch (error: any) {
    console.error('Quotation update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
