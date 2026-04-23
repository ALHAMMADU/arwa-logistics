import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

export async function POST(request: Request) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;
    const session = access.session;

    const body = await request.json();
    const { action, shipmentIds, status } = body;

    if (!action || !shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return NextResponse.json({ success: false, error: 'action and shipmentIds are required' }, { status: 400 });
    }

    const validStatuses = [
      'CREATED', 'WAITING_WAREHOUSE_ARRIVAL', 'RECEIVED_AT_WAREHOUSE', 'PROCESSING',
      'READY_FOR_DISPATCH', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION',
      'CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY', 'DELIVERED',
    ];

    if (action === 'updateStatus') {
      if (!status || !validStatuses.includes(status)) {
        return NextResponse.json({ success: false, error: 'Valid status is required for updateStatus' }, { status: 400 });
      }

      // Get current shipments to record previous status
      const shipments = await db.shipment.findMany({
        where: { id: { in: shipmentIds }, active: true },
        select: { id: true, status: true, shipmentId: true },
      });

      // Update all matching active shipments
      const result = await db.shipment.updateMany({
        where: { id: { in: shipmentIds }, active: true },
        data: {
          status,
          ...(status === 'DELIVERED' ? { actualDelivery: new Date() } : {}),
        },
      });

      // Create tracking events and audit logs for each shipment
      const trackingEvents = shipments.map(s => ({
        shipmentId: s.id,
        status,
        location: 'Admin Bulk Update',
        notes: `Status bulk updated from ${s.status} to ${status}`,
      }));

      const auditLogs = shipments.map(s => ({
        userId: session.id,
        action: 'STATUS_CHANGE',
        entity: 'Shipment',
        entityId: s.id,
        details: JSON.stringify({ from: s.status, to: status, bulk: true }),
      }));

      await Promise.all([
        db.shipmentTracking.createMany({ data: trackingEvents }),
        db.auditLog.createMany({ data: auditLogs }),
      ]);

      return NextResponse.json({ success: true, data: { updated: result.count } });
    }

    if (action === 'delete') {
      // Soft-delete by setting active = false
      const result = await db.shipment.updateMany({
        where: { id: { in: shipmentIds }, active: true },
        data: { active: false },
      });

      // Create audit logs
      const auditLogs = shipmentIds.map((id: string) => ({
        userId: session.id,
        action: 'DELETE',
        entity: 'Shipment',
        entityId: id,
        details: JSON.stringify({ softDelete: true, bulk: true }),
      }));

      await db.auditLog.createMany({ data: auditLogs });

      return NextResponse.json({ success: true, data: { updated: result.count } });
    }

    if (action === 'export') {
      const shipments = await db.shipment.findMany({
        where: { id: { in: shipmentIds }, active: true },
        include: {
          customer: { select: { name: true, email: true, company: true } },
          warehouse: { select: { name: true, city: true } },
          route: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const headers = [
        'Shipment ID', 'Tracking Number', 'Sender Name', 'Sender Phone',
        'Receiver Name', 'Receiver Phone', 'Receiver Address',
        'Destination Country', 'Destination City', 'Weight (kg)',
        'Length (cm)', 'Width (cm)', 'Height (cm)',
        'Product Description', 'Shipment Value (USD)',
        'Shipping Method', 'Shipment Type', 'Status',
        'Customer Name', 'Customer Email', 'Customer Company',
        'Warehouse', 'Route', 'Estimated Delivery', 'Actual Delivery',
        'Created At', 'Updated At',
      ];

      const rows = shipments.map(s => [
        s.shipmentId, s.trackingNumber, s.senderName, s.senderPhone || '',
        s.receiverName, s.receiverPhone || '', s.receiverAddress || '',
        s.destinationCountry, s.destinationCity, s.weight.toString(),
        s.length?.toString() || '', s.width?.toString() || '', s.height?.toString() || '',
        s.productDescription, s.shipmentValue.toString(),
        s.shippingMethod, s.shipmentType, s.status,
        s.customer.name, s.customer.email, s.customer.company || '',
        s.warehouse ? `${s.warehouse.name} (${s.warehouse.city})` : '',
        s.route?.name || '',
        s.estimatedDelivery ? new Date(s.estimatedDelivery).toISOString() : '',
        s.actualDelivery ? new Date(s.actualDelivery).toISOString() : '',
        new Date(s.createdAt).toISOString(), new Date(s.updatedAt).toISOString(),
      ]);

      const escapeCsvField = (field: string): string => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      const csvHeader = headers.map(escapeCsvField).join(',');
      const csvRows = rows.map(row => row.map(escapeCsvField).join(','));
      const csvContent = [csvHeader, ...csvRows].join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="shipments-bulk-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Use updateStatus, delete, or export' }, { status: 400 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
