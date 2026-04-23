import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;

    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        company: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { shipments: true, auditLogs: true } },
        warehouseManaged: { select: { id: true, name: true, city: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const shipmentCount = await db.shipment.count({
      where: { customerId: id },
    });

    return NextResponse.json({
      success: true,
      data: { ...user, shipmentCount },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, company, role, active } = body;

    if (id === session.id && role && role !== session.role) {
      return NextResponse.json(
        { success: false, error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    if (id === session.id && active === false) {
      return NextResponse.json(
        { success: false, error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (email && email !== existingUser.email) {
      const emailTaken = await db.user.findUnique({ where: { email } });
      if (emailTaken) {
        return NextResponse.json(
          { success: false, error: 'Email already in use' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (company !== undefined) updateData.company = company || null;
    if (role !== undefined) updateData.role = role;
    if (active !== undefined) updateData.active = active;

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        company: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { shipments: true, auditLogs: true } },
      },
    });

    const changes: string[] = [];
    if (name && name !== existingUser.name) changes.push(`name: "${existingUser.name}" -> "${name}"`);
    if (email && email !== existingUser.email) changes.push(`email: "${existingUser.email}" -> "${email}"`);
    if (role && role !== existingUser.role) changes.push(`role: ${existingUser.role} -> ${role}`);
    if (active !== undefined && active !== existingUser.active) changes.push(`active: ${existingUser.active} -> ${active}`);

    if (changes.length > 0) {
      await createAuditLog({
        userId: session.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        details: JSON.stringify({ changes }),
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;
    const session = access.session;

    const { id } = await params;

    if (id === session.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: { active: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
      },
    });

    await createAuditLog({
      userId: session.id,
      action: 'DELETE',
      entity: 'User',
      entityId: id,
      details: JSON.stringify({ action: 'deactivated', userName: existingUser.name }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
