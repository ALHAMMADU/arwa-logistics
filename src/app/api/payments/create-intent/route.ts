import { NextResponse } from 'next/server';
import { isStripeConfigured, createPaymentIntent } from '@/lib/payments';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const access = checkAccess(request);
  if (!access.allowed) return access.response;

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Payment gateway is not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { shipmentId } = body;

    if (!shipmentId) {
      return NextResponse.json(
        { success: false, error: 'Shipment ID is required' },
        { status: 400 }
      );
    }

    // Get shipment details
    const shipment = await db.shipment.findUnique({
      where: { id: shipmentId },
      include: { customer: { select: { id: true, name: true, email: true } } },
    });

    if (!shipment) {
      return NextResponse.json(
        { success: false, error: 'Shipment not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this shipment or is admin
    if (access.session.role !== 'ADMIN' && shipment.customerId !== access.session.id) {
      return NextResponse.json(
        { success: false, error: 'You can only pay for your own shipments' },
        { status: 403 }
      );
    }

    // Check if payment already exists
    const existingPayment = await db.payment.findFirst({
      where: { shipmentId, status: { in: ['PENDING', 'PROCESSING'] } },
    });

    if (existingPayment) {
      return NextResponse.json(
        { success: false, error: 'A pending payment already exists for this shipment' },
        { status: 400 }
      );
    }

    // Calculate fees
    const subtotal = shipment.shipmentValue * 0.05; // 5% shipping cost
    const handlingFee = subtotal * 0.05; // 5% handling
    const insuranceFee = shipment.shipmentValue * 0.01; // 1% insurance
    const totalAmount = subtotal + handlingFee + insuranceFee;

    // Create Stripe payment intent
    const result = await createPaymentIntent({
      amount: totalAmount,
      shipmentId: shipment.shipmentId,
      customerId: shipment.customerId,
      description: `Shipping for ${shipment.shipmentId} - ${shipment.productDescription}`,
      metadata: {
        shipmentId: shipment.id,
        customerEmail: shipment.customer.email,
      },
    });

    // Generate payment ID: PAY-2026-XXXXXX
    const lastPayment = await db.payment.findFirst({
      where: { paymentId: { startsWith: 'PAY-2026-' } },
      orderBy: { paymentId: 'desc' },
    });
    const nextNum = lastPayment
      ? parseInt(lastPayment.paymentId.replace('PAY-2026-', '')) + 1
      : 1;
    const paymentId = `PAY-2026-${String(nextNum).padStart(6, '0')}`;

    // Create payment record
    const payment = await db.payment.create({
      data: {
        paymentId,
        shipmentId: shipment.id,
        userId: access.session.id,
        amount: totalAmount,
        subtotal,
        handlingFee,
        insuranceFee,
        method: 'CREDIT_CARD',
        status: 'PENDING',
        transactionRef: result.paymentIntentId,
      },
    });

    await createAuditLog({
      userId: access.session.id,
      action: 'CREATE_PAYMENT_INTENT',
      entity: 'Payment',
      entityId: payment.id,
      details: JSON.stringify({ paymentId: payment.paymentId, amount: totalAmount, stripePaymentIntentId: result.paymentIntentId }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: result.clientSecret,
        paymentId: payment.id,
        amount: totalAmount,
        breakdown: { subtotal, handlingFee, insuranceFee },
      },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
