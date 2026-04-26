import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';

// POST: Create a new quotation request
export async function POST(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const body = await request.json();
    const {
      originCountry,
      originCity,
      destinationCountry,
      destinationCity,
      shippingMethod,
      shipmentType,
      weight,
      length,
      width,
      height,
      commodityType,
      specialRequirements,
    } = body;

    // Validate required fields
    if (!originCountry || !originCity || !destinationCountry || !destinationCity || !shippingMethod || !shipmentType) {
      return NextResponse.json(
        { success: false, error: 'Origin, destination, shipping method, and shipment type are required' },
        { status: 400 }
      );
    }

    const validShippingMethods = ['AIR', 'SEA', 'LAND'];
    if (!validShippingMethods.includes(shippingMethod)) {
      return NextResponse.json(
        { success: false, error: 'Invalid shipping method. Must be AIR, SEA, or LAND' },
        { status: 400 }
      );
    }

    const validShipmentTypes = ['PARCEL', 'LCL', 'FCL'];
    if (!validShipmentTypes.includes(shipmentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid shipment type. Must be PARCEL, LCL, or FCL' },
        { status: 400 }
      );
    }

    // Generate quotation ID: QUO-2026-XXXXXX
    const lastQuotation = await db.quotation.findFirst({
      where: { quotationId: { startsWith: 'QUO-2026-' } },
      orderBy: { quotationId: 'desc' },
    });
    const nextNum = lastQuotation
      ? parseInt(lastQuotation.quotationId.replace('QUO-2026-', '')) + 1
      : 1;
    const quotationId = `QUO-2026-${String(nextNum).padStart(6, '0')}`;

    const quotation = await db.quotation.create({
      data: {
        quotationId,
        customerId: session.id,
        status: 'PENDING',
        originCountry,
        originCity,
        destinationCountry,
        destinationCity,
        shippingMethod,
        shipmentType,
        weight: weight ? parseFloat(weight) : null,
        length: length ? parseFloat(length) : null,
        width: width ? parseFloat(width) : null,
        height: height ? parseFloat(height) : null,
        commodityType: commodityType || null,
        specialRequirements: specialRequirements || null,
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, company: true } },
      },
    });

    await createAuditLog({
      userId: session.id,
      action: 'CREATE',
      entity: 'Quotation',
      entityId: quotation.id,
      details: JSON.stringify({ quotationId: quotation.quotationId, origin: `${originCity}, ${originCountry}`, destination: `${destinationCity}, ${destinationCountry}`, shippingMethod, shipmentType }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: quotation }, { status: 201 });
  } catch (error: any) {
    console.error('Quotation creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: List quotations with filters
export async function GET(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const shippingMethod = searchParams.get('shippingMethod');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: any = {};

    // Non-admin users only see their own quotations
    if (session.role !== 'ADMIN') {
      where.customerId = session.id;
    } else if (customerId) {
      where.customerId = customerId;
    }

    if (status) where.status = status;
    if (shippingMethod) where.shippingMethod = shippingMethod;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    if (search) {
      where.OR = [
        { quotationId: { contains: search } },
        { originCountry: { contains: search } },
        { originCity: { contains: search } },
        { destinationCountry: { contains: search } },
        { destinationCity: { contains: search } },
        { commodityType: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    const total = await db.quotation.count({ where });
    const quotations = await db.quotation.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, company: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        quotations,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Quotation list error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
