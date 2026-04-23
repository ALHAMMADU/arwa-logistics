import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateShipmentId, generateTrackingNumber, generateQRCodeData } from '@/lib/shipping-server';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';
import { sendShipmentCreatedEmail } from '@/lib/email';

const VALID_SORT_FIELDS = ['createdAt', 'shipmentValue', 'weight', 'updatedAt'];
const VALID_SORT_ORDERS = ['asc', 'desc'];

export async function GET(request: Request) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    // Any authenticated user
    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { searchParams } = new URL(request.url);

    // ─── Existing filters ─────────────────────────────
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // ─── New filters ──────────────────────────────────
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const method = searchParams.get('method');
    const type = searchParams.get('type');
    const country = searchParams.get('country');

    // ─── Pagination ───────────────────────────────────
    let page = parseInt(searchParams.get('page') || '1');
    let limit = parseInt(searchParams.get('limit') || '20');
    if (page < 1) page = 1;
    if (limit < 1) limit = 20;
    if (limit > 100) limit = 100;
    const skip = (page - 1) * limit;

    // ─── Sorting ──────────────────────────────────────
    const sortField = searchParams.get('sort') || 'createdAt';
    const sortOrder = searchParams.get('order') || 'desc';
    const orderBy: any = {};
    if (VALID_SORT_FIELDS.includes(sortField)) {
      orderBy[sortField] = VALID_SORT_ORDERS.includes(sortOrder) ? sortOrder : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    // ─── Build where clause ───────────────────────────
    let where: any = {};
    if (session.role === 'CUSTOMER') {
      where.customerId = session.id;
    } else if (session.role === 'WAREHOUSE_STAFF') {
      const warehouse = await db.warehouse.findFirst({ where: { managerId: session.id } });
      if (warehouse) where.warehouseId = warehouse.id;
    }

    if (status) where.status = status;
    if (method) where.shippingMethod = method;
    if (type) where.shipmentType = type;
    if (country) where.destinationCountry = country;

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // Search filter: search across shipmentId, trackingNumber, destinationCity, receiverName, senderName
    if (search) {
      where.OR = [
        { shipmentId: { contains: search } },
        { trackingNumber: { contains: search } },
        { destinationCity: { contains: search } },
        { receiverName: { contains: search } },
        { senderName: { contains: search } },
      ];
    }

    const [shipments, total] = await Promise.all([
      db.shipment.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true, company: true } },
          warehouse: { select: { id: true, name: true, city: true } },
          route: { select: { id: true, name: true } },
          trackingEvents: { orderBy: { timestamp: 'desc' }, take: 1 },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.shipment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        shipments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    // CUSTOMER or ADMIN only
    const access = checkAccess(request, { roles: ['CUSTOMER', 'ADMIN'] });
    if (!access.allowed) return access.response;
    const session = access.session;

    const body = await request.json();
    const {
      senderName, senderPhone, receiverName, receiverPhone, receiverAddress,
      destinationCountry, destinationCity, weight, length, width, height,
      productDescription, shipmentValue, shippingMethod, shipmentType, warehouseId, routeId
    } = body;

    if (!senderName || !receiverName || !destinationCountry || !destinationCity || !weight || !productDescription || !shipmentValue || !shippingMethod || !shipmentType) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Validate numeric fields
    const parsedWeight = parseFloat(weight);
    const parsedValue = parseFloat(shipmentValue);
    if (isNaN(parsedWeight) || parsedWeight <= 0 || parsedWeight > 100000) {
      return NextResponse.json({ success: false, error: 'Invalid weight value' }, { status: 400 });
    }
    if (isNaN(parsedValue) || parsedValue < 0 || parsedValue > 10000000) {
      return NextResponse.json({ success: false, error: 'Invalid shipment value' }, { status: 400 });
    }

    // Validate enum fields
    const VALID_METHODS = ['AIR', 'SEA', 'LAND'];
    const VALID_TYPES = ['PARCEL', 'LCL', 'FCL'];
    if (!VALID_METHODS.includes(shippingMethod)) {
      return NextResponse.json({ success: false, error: 'Invalid shipping method' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(shipmentType)) {
      return NextResponse.json({ success: false, error: 'Invalid shipment type' }, { status: 400 });
    }

    // Validate string length limits
    const MAX_STRING_LENGTH = 500;
    if (senderName.length > MAX_STRING_LENGTH || receiverName.length > MAX_STRING_LENGTH) {
      return NextResponse.json({ success: false, error: 'Name fields are too long' }, { status: 400 });
    }
    if (productDescription.length > 2000) {
      return NextResponse.json({ success: false, error: 'Product description is too long' }, { status: 400 });
    }

    const shipmentId = await generateShipmentId();
    const trackingNumber = generateTrackingNumber();
    const qrCodeData = generateQRCodeData(shipmentId, trackingNumber);

    const shipment = await db.shipment.create({
      data: {
        shipmentId,
        trackingNumber,
        senderName,
        senderPhone: senderPhone || null,
        receiverName,
        receiverPhone: receiverPhone || null,
        receiverAddress: receiverAddress || null,
        destinationCountry,
        destinationCity,
        weight: parsedWeight,
        length: length ? parseFloat(length) : null,
        width: width ? parseFloat(width) : null,
        height: height ? parseFloat(height) : null,
        productDescription,
        shipmentValue: parsedValue,
        shippingMethod,
        shipmentType,
        status: 'CREATED',
        qrCodeData,
        customerId: session.id,
        warehouseId: warehouseId || null,
        routeId: routeId || null,
      },
    });

    // Create initial tracking event
    await db.shipmentTracking.create({
      data: {
        shipmentId: shipment.id,
        status: 'CREATED',
        location: 'Online',
        notes: 'Shipment created successfully',
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.id,
      action: 'CREATE',
      entity: 'Shipment',
      entityId: shipment.id,
      details: JSON.stringify({ shipmentId, trackingNumber }),
      ipAddress: getClientIp(request),
    });

    // Send shipment created email notification (non-blocking)
    sendShipmentCreatedEmail(
      session.email,
      session.id ? (await db.user.findUnique({ where: { id: session.id }, select: { name: true } }))?.name || 'Customer' : 'Customer',
      shipmentId,
      trackingNumber,
      `${destinationCity}, ${destinationCountry}`
    ).catch((err) => {
      console.error('[EMAIL] Non-blocking error in sendShipmentCreatedEmail:', err.message);
    });

    return NextResponse.json({ success: true, data: shipment }, { status: 201 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
