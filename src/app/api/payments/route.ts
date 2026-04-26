import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';

// POST: Create a new payment
export async function POST(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const body = await request.json();
    const { shipmentId, method, notes } = body;

    if (!shipmentId || !method) {
      return NextResponse.json(
        { success: false, error: 'shipmentId and method are required' },
        { status: 400 }
      );
    }

    const validMethods = ['CREDIT_CARD', 'BANK_TRANSFER', 'WALLET', 'CASH'];
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method. Must be one of: ' + validMethods.join(', ') },
        { status: 400 }
      );
    }

    // Get shipment with route for cost calculation
    const shipment = await db.shipment.findUnique({
      where: { id: shipmentId },
      include: { route: true, customer: true },
    });

    if (!shipment) {
      return NextResponse.json(
        { success: false, error: 'Shipment not found' },
        { status: 404 }
      );
    }

    // Customers can only create payments for their own shipments
    if (session.role === 'CUSTOMER' && shipment.customerId !== session.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if a PENDING payment already exists for this shipment
    const existingPayment = await db.payment.findFirst({
      where: { shipmentId, status: { in: ['PENDING', 'PROCESSING'] } },
    });

    if (existingPayment) {
      return NextResponse.json(
        { success: false, error: 'A pending/processing payment already exists for this shipment' },
        { status: 400 }
      );
    }

    // Calculate costs
    const pricePerKg = shipment.route?.pricePerKg ?? 0;
    const subtotal = Math.round(shipment.weight * pricePerKg * 100) / 100;
    const handlingFee = Math.round(subtotal * 0.05 * 100) / 100;
    const insuranceFee = Math.round(shipment.shipmentValue * 0.01 * 100) / 100;
    const amount = Math.round((subtotal + handlingFee + insuranceFee) * 100) / 100;

    // Generate payment ID: PAY-2026-000001
    const lastPayment = await db.payment.findFirst({
      where: { paymentId: { startsWith: 'PAY-2026-' } },
      orderBy: { paymentId: 'desc' },
    });
    const nextNum = lastPayment
      ? parseInt(lastPayment.paymentId.replace('PAY-2026-', '')) + 1
      : 1;
    const paymentId = `PAY-2026-${String(nextNum).padStart(6, '0')}`;

    const payment = await db.payment.create({
      data: {
        paymentId,
        shipmentId,
        userId: session.id,
        amount,
        subtotal,
        handlingFee,
        insuranceFee,
        currency: 'USD',
        method,
        status: 'PENDING',
        notes: notes || null,
      },
      include: {
        shipment: { select: { shipmentId: true, trackingNumber: true, destinationCity: true, destinationCountry: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      userId: session.id,
      action: 'CREATE',
      entity: 'Payment',
      entityId: payment.id,
      details: JSON.stringify({ paymentId: payment.paymentId, amount, method, shipmentId }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error: any) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: List payments with filters
export async function GET(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const shipmentId = searchParams.get('shipmentId');
    const method = searchParams.get('method');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: any = {};

    // Non-admin users only see their own payments
    if (session.role !== 'ADMIN') {
      where.userId = session.id;
    }

    if (status) where.status = status;
    if (shipmentId) where.shipmentId = shipmentId;
    if (method) where.method = method;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    if (search) {
      where.OR = [
        { paymentId: { contains: search } },
        { transactionRef: { contains: search } },
        { shipment: { shipmentId: { contains: search } } },
        { user: { name: { contains: search } } },
      ];
    }

    const total = await db.payment.count({ where });
    const payments = await db.payment.findMany({
      where,
      include: {
        shipment: { select: { shipmentId: true, trackingNumber: true, destinationCity: true, destinationCountry: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        payments,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Payment list error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
