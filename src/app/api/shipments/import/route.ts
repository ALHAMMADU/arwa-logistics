import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';
import { generateShipmentId, generateTrackingNumber, generateQRCodeData } from '@/lib/shipping-server';
import Papa from 'papaparse';

// POST /api/shipments/import - Import shipments from CSV
export async function POST(request: Request) {
  try {
    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;
    const session = access.session;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ success: false, error: 'Only CSV files are supported' }, { status: 400 });
    }

    const text = await file.text();
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to parse CSV: ' + parsed.errors[0].message },
        { status: 400 }
      );
    }

    const validMethods = ['AIR', 'SEA', 'LAND'];
    const validTypes = ['PARCEL', 'LCL', 'FCL'];
    const results = { success: 0, failed: 0, errors: [] as { row: number; message: string }[] };

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i] as any;
      const rowNum = i + 2; // +2 for header row and 0-based index

      try {
        // Validate required fields
        const requiredFields = ['senderName', 'receiverName', 'destinationCountry', 'destinationCity', 'weight', 'productDescription', 'shipmentValue', 'shippingMethod', 'shipmentType'];
        const missing = requiredFields.filter(f => !row[f]);
        if (missing.length > 0) {
          results.errors.push({ row: rowNum, message: `Missing required fields: ${missing.join(', ')}` });
          results.failed++;
          continue;
        }

        // Validate shipping method
        const method = row.shippingMethod?.toUpperCase();
        if (!validMethods.includes(method)) {
          results.errors.push({ row: rowNum, message: `Invalid shipping method: ${row.shippingMethod}. Must be AIR, SEA, or LAND` });
          results.failed++;
          continue;
        }

        // Validate shipment type
        const type = row.shipmentType?.toUpperCase();
        if (!validTypes.includes(type)) {
          results.errors.push({ row: rowNum, message: `Invalid shipment type: ${row.shipmentType}. Must be PARCEL, LCL, or FCL` });
          results.failed++;
          continue;
        }

        // Validate numeric fields
        const weight = parseFloat(row.weight);
        const shipmentValue = parseFloat(row.shipmentValue);
        if (isNaN(weight) || weight <= 0) {
          results.errors.push({ row: rowNum, message: `Invalid weight: ${row.weight}` });
          results.failed++;
          continue;
        }
        if (isNaN(shipmentValue) || shipmentValue < 0) {
          results.errors.push({ row: rowNum, message: `Invalid shipment value: ${row.shipmentValue}` });
          results.failed++;
          continue;
        }

        // Find or use first customer as default
        const customerEmail = row.customerEmail;
        let customerId = session.id; // default to admin
        if (customerEmail) {
          const customer = await db.user.findFirst({
            where: { email: customerEmail, role: 'CUSTOMER', active: true },
          });
          if (customer) customerId = customer.id;
        }

        // Find a matching route
        const route = await db.shippingRoute.findFirst({
          where: {
            destinationCountry: row.destinationCountry,
            [`allowed${method.charAt(0) + method.slice(1).toLowerCase()}`]: true,
            active: true,
          },
        });

        // Generate IDs
        const shipmentId = await generateShipmentId();
        const trackingNumber = generateTrackingNumber();
        const qrData = generateQRCodeData(shipmentId, trackingNumber);

        // Parse optional dimensions
        const length = row.length ? parseFloat(row.length) : null;
        const width = row.width ? parseFloat(row.width) : null;
        const height = row.height ? parseFloat(row.height) : null;

        // Create shipment
        await db.shipment.create({
          data: {
            shipmentId,
            trackingNumber,
            senderName: row.senderName,
            senderPhone: row.senderPhone || null,
            receiverName: row.receiverName,
            receiverPhone: row.receiverPhone || null,
            receiverAddress: row.receiverAddress || null,
            destinationCountry: row.destinationCountry,
            destinationCity: row.destinationCity,
            weight,
            length: length && !isNaN(length) ? length : null,
            width: width && !isNaN(width) ? width : null,
            height: height && !isNaN(height) ? height : null,
            productDescription: row.productDescription,
            shipmentValue,
            shippingMethod: method,
            shipmentType: type,
            qrCodeData: qrData,
            notes: row.notes || null,
            customerId,
            routeId: route?.id || null,
          },
        });

        results.success++;
      } catch (err: any) {
        results.errors.push({ row: rowNum, message: err.message || 'Unknown error' });
        results.failed++;
      }
    }

    // Audit log
    await createAuditLog({
      userId: session.id,
      action: 'IMPORT',
      entity: 'Shipment',
      details: JSON.stringify({ file: file.name, total: parsed.data.length, success: results.success, failed: results.failed }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
