import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';
import { sseEmitter } from '@/lib/event-emitter';
import crypto from 'crypto';

// POST: Simulate payment processing
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;
    const body = await request.json();
    const { cardLast4, cardholderName, bankReference, walletId } = body;

    const payment = await db.payment.findUnique({ where: { id } });
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Only the owner or ADMIN can process
    if (session.role !== 'ADMIN' && payment.userId !== session.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Can only process PENDING payments
    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Payment is already ${payment.status}. Only PENDING payments can be processed.` },
        { status: 400 }
      );
    }

    // Update to PROCESSING
    await db.payment.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });

    // Simulate processing delay and generate transaction reference
    const transactionRef = `TXN-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    const updateData: any = {
      status: 'COMPLETED',
      paidAt: new Date(),
      transactionRef,
    };

    if (payment.method === 'CREDIT_CARD' && cardLast4) {
      updateData.cardLast4 = cardLast4.replace(/\D/g, '').slice(-4);
    }

    // Simulate: 95% success rate
    const isSuccess = Math.random() > 0.05;

    if (!isSuccess) {
      const failedPayment = await db.payment.update({
        where: { id },
        data: { status: 'FAILED', notes: 'Payment gateway returned an error. Please try again.' },
        include: {
          shipment: { select: { shipmentId: true, trackingNumber: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      await createAuditLog({
        userId: session.id,
        action: 'STATUS_CHANGE',
        entity: 'Payment',
        entityId: id,
        details: JSON.stringify({ paymentId: payment.paymentId, from: 'PENDING', to: 'FAILED', reason: 'Gateway error' }),
        ipAddress: getClientIp(request),
      });

      // Emit SSE payment_update event for failed payment
      sseEmitter.emit('payment_update', {
        paymentId: payment.paymentId,
        shipmentId: payment.shipmentId,
        status: 'FAILED',
        amount: payment.amount,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: false,
        error: 'Payment processing failed. Please try again.',
        data: failedPayment,
      }, { status: 400 });
    }

    const completedPayment = await db.payment.update({
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
        from: 'PENDING',
        to: 'COMPLETED',
        transactionRef,
        method: payment.method,
      }),
      ipAddress: getClientIp(request),
    });

    // Emit SSE payment_update event for completed payment
    sseEmitter.emit('payment_update', {
      paymentId: payment.paymentId,
      shipmentId: payment.shipmentId,
      status: 'COMPLETED',
      amount: payment.amount,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: completedPayment,
      message: 'Payment processed successfully',
    });
  } catch (error: any) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
