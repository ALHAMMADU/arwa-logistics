import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

// GET /api/admin/export - Export all shipments as CSV (Admin only)
export async function GET(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;

    const shipments = await db.shipment.findMany({
      include: {
        customer: { select: { name: true, email: true, company: true } },
        warehouse: { select: { name: true, city: true } },
        route: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build CSV header
    const headers = [
      'Shipment ID',
      'Tracking Number',
      'Sender Name',
      'Sender Phone',
      'Receiver Name',
      'Receiver Phone',
      'Receiver Address',
      'Destination Country',
      'Destination City',
      'Weight (kg)',
      'Length (cm)',
      'Width (cm)',
      'Height (cm)',
      'Product Description',
      'Shipment Value (USD)',
      'Shipping Method',
      'Shipment Type',
      'Status',
      'Customer Name',
      'Customer Email',
      'Customer Company',
      'Warehouse',
      'Route',
      'Estimated Delivery',
      'Actual Delivery',
      'Created At',
      'Updated At',
    ];

    // Build CSV rows
    const rows = shipments.map((s) => [
      s.shipmentId,
      s.trackingNumber,
      s.senderName,
      s.senderPhone || '',
      s.receiverName,
      s.receiverPhone || '',
      s.receiverAddress || '',
      s.destinationCountry,
      s.destinationCity,
      s.weight.toString(),
      s.length?.toString() || '',
      s.width?.toString() || '',
      s.height?.toString() || '',
      s.productDescription,
      s.shipmentValue.toString(),
      s.shippingMethod,
      s.shipmentType,
      s.status,
      s.customer.name,
      s.customer.email,
      s.customer.company || '',
      s.warehouse ? `${s.warehouse.name} (${s.warehouse.city})` : '',
      s.route?.name || '',
      s.estimatedDelivery ? new Date(s.estimatedDelivery).toISOString() : '',
      s.actualDelivery ? new Date(s.actualDelivery).toISOString() : '',
      new Date(s.createdAt).toISOString(),
      new Date(s.updatedAt).toISOString(),
    ]);

    // Escape CSV fields (handle commas, quotes, newlines)
    const escapeCsvField = (field: string): string => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csvHeader = headers.map(escapeCsvField).join(',');
    const csvRows = rows.map((row) => row.map(escapeCsvField).join(','));
    const csvContent = [csvHeader, ...csvRows].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="shipments-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
