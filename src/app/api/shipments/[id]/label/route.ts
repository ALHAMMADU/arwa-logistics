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
        customer: { select: { name: true, email: true, phone: true, company: true } },
        warehouse: { select: { name: true, city: true, address: true } },
        route: true,
      },
    });

    if (!shipment) {
      return NextResponse.json({ success: false, error: 'Shipment not found' }, { status: 404 });
    }

    // Customers can only see their own shipments
    if (session.role === 'CUSTOMER' && shipment.customerId !== session.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const origin = request.headers.get('origin') || new URL(request.url).origin;
    const trackingUrl = `${origin}/tracking/${shipment.trackingNumber}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(trackingUrl)}`;

    // Check if JSON format is requested
    const url = new URL(request.url);
    const format = url.searchParams.get('format');

    if (format === 'json') {
      // Return structured label data for frontend rendering
      const labelData = {
        shipmentId: shipment.shipmentId,
        trackingNumber: shipment.trackingNumber,
        senderName: shipment.senderName,
        senderPhone: shipment.senderPhone || undefined,
        senderAddress: undefined as string | undefined,
        receiverName: shipment.receiverName,
        receiverPhone: shipment.receiverPhone || undefined,
        receiverAddress: shipment.receiverAddress || undefined,
        originCountry: shipment.route?.originCountry || 'China',
        originCity: shipment.route ? undefined : 'Guangzhou',
        destinationCountry: shipment.destinationCountry,
        destinationCity: shipment.destinationCity,
        shippingMethod: shipment.shippingMethod,
        shipmentType: shipment.shipmentType,
        weight: shipment.weight,
        length: shipment.length || undefined,
        width: shipment.width || undefined,
        height: shipment.height || undefined,
        shipmentValue: shipment.shipmentValue,
        productDescription: shipment.productDescription,
        numberOfPackages: 1,
        qrCodeUrl,
        trackingUrl,
        warehouseName: shipment.warehouse?.name,
        warehouseCity: shipment.warehouse?.city,
        createdAt: shipment.createdAt.toISOString(),
        estimatedDelivery: shipment.estimatedDelivery?.toISOString(),
      };

      return NextResponse.json({
        success: true,
        data: labelData,
      });
    }

    // Default: Return HTML label for direct printing
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Shipping Label - ${shipment.shipmentId}</title>
<style>
  @page { size: 4in 6in; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; width: 4in; height: 6in; padding: 12px; background: white; }
  .label { border: 2px solid #000; height: 100%; padding: 10px; display: flex; flex-direction: column; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 8px; }
  .logo { font-size: 14px; font-weight: bold; letter-spacing: 1px; color: #059669; }
  .logo-sub { font-size: 7px; color: #666; }
  .method-badge { background: ${shipment.shippingMethod === 'AIR' ? '#0284c7' : shipment.shippingMethod === 'SEA' ? '#1d4ed8' : '#b45309'}; color: white; padding: 3px 8px; font-size: 9px; font-weight: bold; border-radius: 3px; letter-spacing: 1px; }
  .shipment-id { font-size: 15px; font-weight: bold; font-family: monospace; text-align: center; margin: 4px 0; letter-spacing: 1.5px; }
  .tracking { font-size: 9px; text-align: center; color: #059669; font-family: monospace; font-weight: bold; letter-spacing: 1px; margin-bottom: 4px; }
  .section { margin-bottom: 4px; }
  .section-title { font-size: 7px; text-transform: uppercase; color: #059669; letter-spacing: 0.5px; margin-bottom: 2px; font-weight: bold; }
  .section-content { font-size: 10px; line-height: 1.3; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .info-item { }
  .info-label { font-size: 6px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; }
  .info-value { font-size: 9px; font-weight: 500; }
  .route-section { display: flex; align-items: center; justify-content: space-between; background: #f0fdf4; padding: 5px 8px; border-radius: 4px; margin: 4px 0; border: 1px solid #bbf7d0; }
  .route-point { text-align: center; flex: 1; }
  .route-label { font-size: 7px; text-transform: uppercase; color: #888; }
  .route-city { font-size: 11px; font-weight: bold; }
  .route-country { font-size: 8px; color: #666; }
  .route-arrow { font-size: 16px; color: #059669; font-weight: bold; padding: 0 8px; }
  .route-method { font-size: 6px; color: #059669; }
  .contact-box { border: 1px solid #e5e7eb; border-radius: 3px; padding: 4px 6px; }
  .contact-title { font-size: 7px; text-transform: uppercase; color: #059669; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 2px; }
  .contact-name { font-size: 9px; font-weight: 600; }
  .contact-detail { font-size: 8px; color: #666; }
  .contact-address { font-size: 7px; color: #888; margin-top: 1px; }
  .details-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; font-size: 8px; }
  .detail-label { color: #999; text-transform: uppercase; font-size: 6px; letter-spacing: 0.5px; }
  .detail-value { font-weight: 600; font-size: 9px; }
  .handling { display: flex; justify-content: center; gap: 8px; padding: 3px 0; }
  .handling-badge { display: flex; align-items: center; gap: 3px; border: 2px solid; border-radius: 3px; padding: 2px 6px; }
  .handling-badge.fragile { border-color: #dc2626; background: #fef2f2; color: #dc2626; }
  .handling-badge.this-side-up { border-color: #d97706; background: #fffbeb; color: #d97706; }
  .handling-text { font-size: 9px; font-weight: 900; letter-spacing: 2px; }
  .qr-section { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: auto; padding-top: 4px; border-top: 1px dashed #d1d5db; }
  .qr-section img { width: 70px; height: 70px; }
  .qr-info { font-size: 7px; color: #888; max-width: 120px; }
  .qr-title { font-weight: bold; color: #059669; font-size: 8px; }
  .qr-url { margin-top: 2px; word-break: break-all; }
  .footer { font-size: 6px; text-align: center; color: #aaa; border-top: 1px solid #e5e7eb; padding-top: 3px; margin-top: 2px; }
</style>
</head>
<body>
<div class="label">
  <div class="header">
    <div>
      <div class="logo">ARWA LOGISTICS</div>
      <div class="logo-sub">Global Shipping Platform</div>
    </div>
    <div class="method-badge">${shipment.shippingMethod === 'AIR' ? '✈ AIR' : shipment.shippingMethod === 'SEA' ? '🚢 SEA' : '🚛 LAND'} FREIGHT</div>
  </div>

  <div class="shipment-id">${shipment.shipmentId}</div>
  <div class="tracking">TRACKING: ${shipment.trackingNumber}</div>

  <div class="route-section">
    <div class="route-point">
      <div class="route-label">Origin</div>
      <div class="route-city">${shipment.route?.originCountry === 'China' ? 'Guangzhou' : (shipment.route?.originCountry || 'China')}</div>
      <div class="route-country">${shipment.route?.originCountry || 'China'}</div>
    </div>
    <div style="text-align:center">
      <div class="route-arrow">→</div>
      <div class="route-method">${shipment.shippingMethod === 'AIR' ? 'Air Freight' : shipment.shippingMethod === 'SEA' ? 'Sea Freight' : 'Land Freight'}</div>
    </div>
    <div class="route-point">
      <div class="route-label">Destination</div>
      <div class="route-city">${shipment.destinationCity}</div>
      <div class="route-country">${shipment.destinationCountry}</div>
    </div>
  </div>

  <div class="info-grid" style="margin-bottom:4px;">
    <div class="contact-box">
      <div class="contact-title">Sender</div>
      <div class="contact-name">${shipment.senderName}</div>
      ${shipment.senderPhone ? `<div class="contact-detail">${shipment.senderPhone}</div>` : ''}
    </div>
    <div class="contact-box">
      <div class="contact-title">Receiver</div>
      <div class="contact-name">${shipment.receiverName}</div>
      ${shipment.receiverPhone ? `<div class="contact-detail">${shipment.receiverPhone}</div>` : ''}
      ${shipment.receiverAddress ? `<div class="contact-address">${shipment.receiverAddress}</div>` : ''}
    </div>
  </div>

  <div class="details-grid">
    <div>
      <div class="detail-label">Weight</div>
      <div class="detail-value">${shipment.weight} kg</div>
    </div>
    <div>
      <div class="detail-label">Type</div>
      <div class="detail-value">${shipment.shipmentType === 'PARCEL' ? 'Parcel' : shipment.shipmentType === 'LCL' ? 'LCL' : 'FCL'}</div>
    </div>
    <div>
      <div class="detail-label">Value</div>
      <div class="detail-value">$${shipment.shipmentValue.toLocaleString()}</div>
    </div>
    ${shipment.length ? `<div><div class="detail-label">Dimensions</div><div class="detail-value">${shipment.length}×${shipment.width}×${shipment.height} cm</div></div>` : ''}
    <div>
      <div class="detail-label">Packages</div>
      <div class="detail-value">1</div>
    </div>
    <div>
      <div class="detail-label">Product</div>
      <div class="detail-value" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${shipment.productDescription}</div>
    </div>
  </div>

  ${(shipment.shipmentValue >= 500 || shipment.shipmentType !== 'PARCEL') ? `
  <div class="handling">
    ${shipment.shipmentValue >= 500 ? `<div class="handling-badge fragile"><span style="font-size:12px;">⚠</span><span class="handling-text">FRAGILE</span></div>` : ''}
    ${shipment.shipmentType !== 'PARCEL' ? `<div class="handling-badge this-side-up"><span style="font-size:12px;">↑</span><span class="handling-text">THIS SIDE UP</span></div>` : ''}
  </div>
  ` : ''}

  ${shipment.warehouse ? `<div class="section" style="margin-top:2px;"><div class="info-label">Warehouse</div><div class="info-value">${shipment.warehouse.name} - ${shipment.warehouse.city}</div></div>` : ''}

  <div class="qr-section">
    <img src="${qrCodeUrl}" alt="QR Code" />
    <div class="qr-info">
      <div class="qr-title">Scan to Track</div>
      <div class="qr-url">${trackingUrl}</div>
    </div>
  </div>

  <div class="footer">ARWA LOGISTICS — Shipping from China to the World | Printed: ${new Date().toLocaleDateString()} | ${shipment.shipmentId}</div>
</div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${shipment.shipmentId}-label.html"`,
      },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
