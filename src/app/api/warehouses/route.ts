import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request);
    if (!access.allowed) return access.response;

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const whereClause: any = {};
    if (activeOnly) {
      whereClause.active = true;
    }

    const warehouses = await db.warehouse.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        manager: { select: { id: true, name: true, email: true, phone: true } },
        _count: { select: { shipments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enhancedWarehouses = warehouses.map((warehouse) => {
      const shipmentCount = warehouse._count.shipments;
      const capacity = warehouse.capacity || 10000;
      const utilizationPercentage = Math.min(
        Math.round((shipmentCount / capacity) * 100),
        100
      );
      return {
        ...warehouse,
        shipmentCount,
        capacityUtilization: {
          current: shipmentCount,
          capacity,
          percentage: utilizationPercentage,
        },
      };
    });

    return NextResponse.json({ success: true, data: enhancedWarehouses });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;
    const session = access.session;

    const body = await request.json();
    const { name, city, address, capacity, managerId } = body;

    if (!name || !city || !address) {
      return NextResponse.json({ success: false, error: 'Name, city, and address are required' }, { status: 400 });
    }

    const warehouse = await db.warehouse.create({
      data: {
        name,
        city,
        address,
        capacity: capacity || 10000,
        managerId: managerId || null,
      },
    });

    await createAuditLog({
      userId: session.id,
      action: 'CREATE',
      entity: 'Warehouse',
      entityId: warehouse.id,
      details: JSON.stringify({ name, city }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      data: {
        ...warehouse,
        shipmentCount: 0,
        capacityUtilization: {
          current: 0,
          capacity: warehouse.capacity,
          percentage: 0,
        },
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
