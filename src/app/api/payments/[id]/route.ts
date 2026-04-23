import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';

// GET: Get payment details
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        shipment: {
          select: {
            shipmentId: true,
            trackingNumber: true,
            senderName: true,
            receiverName: true,
            destinationCity: true,
            destinationCountry: true,
            weight: true,
            shipmentValue: true,
            shippingMethod: true,
            productDescription: true,
            route: { select: { name: true, pricePerKg: true } },
          },
        },
        user: { select: { id: true, name: true, email: true, phone: true, company: true } },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Customers can only see their own payments
    if (session.role === 'CUSTOMER' && payment.userId !== session.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    console.error('Payment detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update payment (status changes)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    const payment = await db.payment.findUnique({ where: { id } });
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      PENDING: ['PROCESSING', 'FAILED'],
      PROCESSING: ['COMPLETED', 'FAILED'],
      COMPLETED: ['REFUNDED'],
      FAILED: [],
      REFUNDED: [],
    };

    if (status && !validTransitions[payment.status]?.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Cannot transition from ${payment.status} to ${status}` },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'COMPLETED') updateData.paidAt = new Date();
      if (status === 'REFUNDED') updateData.refundedAt = new Date();
    }
    if (notes !== undefined) updateData.notes = notes;

    const updatedPayment = await db.payment.update({
      where: { id },
      data: updateData,
      include: {
        shipment: { select: { shipmentId: true, trackingNumber: true, destinationCity: true, destinationCountry: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      userId: session.id,
      action: 'STATUS_CHANGE',
      entity: 'Payment',
      entityId: id,
      details: JSON.stringify({
        paymentId: payment.paymentId,
        from: payment.status,
        to: status || payment.status,
      }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: updatedPayment });
  } catch (error: any) {
    console.error('Payment update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
