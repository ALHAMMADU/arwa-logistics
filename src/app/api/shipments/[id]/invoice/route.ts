import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;
    const shipment = await db.shipment.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, company: true } },
        warehouse: { select: { id: true, name: true, city: true, address: true } },
        route: true,
        trackingEvents: { orderBy: { timestamp: 'desc' } },
      },
    });

    if (!shipment) {
      return NextResponse.json({ success: false, error: 'Shipment not found' }, { status: 404 });
    }

    // Customers can only get their own invoices
    if (session.role === 'CUSTOMER' && shipment.customerId !== session.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Generate invoice number: INV-2026-XXXXXX
    const shipmentNum = shipment.shipmentId.replace('ARWA-', '').replace('-', '');
    const invoiceNumber = `INV-2026-${shipmentNum.padStart(6, '0')}`;

    // Calculate costs
    const pricePerKg = shipment.route?.pricePerKg ?? 0;
    const subtotal = shipment.weight * pricePerKg;
    const handlingFee = subtotal * 0.05; // 5% of subtotal
    const insurance = shipment.shipmentValue * 0.01; // 1% of shipment value
    const total = subtotal + handlingFee + insurance;

    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);

    const invoiceData = {
      invoiceNumber,
      invoiceDate: now.toISOString(),
      dueDate: dueDate.toISOString(),
      // Customer / Bill To
      billTo: {
        name: shipment.customer.name,
        email: shipment.customer.email,
        company: shipment.customer.company || '',
        phone: shipment.customer.phone || '',
      },
      // Ship To
      shipTo: {
        name: shipment.receiverName,
        address: shipment.receiverAddress || '',
        city: shipment.destinationCity,
        country: shipment.destinationCountry,
        phone: shipment.receiverPhone || '',
      },
      // Shipment details
      shipment: {
        id: shipment.id,
        shipmentId: shipment.shipmentId,
        trackingNumber: shipment.trackingNumber,
        shippingMethod: shipment.shippingMethod,
        shipmentType: shipment.shipmentType,
        productDescription: shipment.productDescription,
        weight: shipment.weight,
        shipmentValue: shipment.shipmentValue,
        status: shipment.status,
        createdAt: shipment.createdAt,
        estimatedDelivery: shipment.estimatedDelivery,
        dimensions: shipment.length
          ? { length: shipment.length, width: shipment.width, height: shipment.height }
          : null,
      },
      // Route
      route: shipment.route
        ? {
            name: shipment.route.name,
            originCountry: shipment.route.originCountry,
            destinationCountry: shipment.route.destinationCountry,
            destinationCity: shipment.route.destinationCity,
            pricePerKg: shipment.route.pricePerKg,
            estimatedDaysMin: shipment.route.estimatedDaysMin,
            estimatedDaysMax: shipment.route.estimatedDaysMax,
          }
        : null,
      // Costs breakdown
      costs: {
        pricePerKg,
        subtotal: Math.round(subtotal * 100) / 100,
        handlingFee: Math.round(handlingFee * 100) / 100,
        insurance: Math.round(insurance * 100) / 100,
        total: Math.round(total * 100) / 100,
      },
      // Bank details
      bankDetails: {
        bank: 'Bank of China',
        account: 'XXXX-XXXX-XXXX',
        swift: 'BKCHCNBJ',
        beneficiary: 'ARWA LOGISTICS CO., LTD',
      },
      paymentTerms: 'Due within 30 days',
    };

    return NextResponse.json({ success: true, data: invoiceData });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
