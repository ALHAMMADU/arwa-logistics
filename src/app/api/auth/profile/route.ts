import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';

// GET /api/auth/profile - Get current user profile
export async function GET(request: Request) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    // Any authenticated user
    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const user = await db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/auth/profile - Update user profile (name, phone, company)
export async function PUT(request: Request) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    // Any authenticated user
    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const body = await request.json();
    const { name, phone, company } = body;

    // Build update object with only provided fields
    const updateData: { name?: string; phone?: string; company?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update. Provide name, phone, or company.' },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: session.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Audit log for profile update
    await createAuditLog({
      userId: session.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: session.id,
      details: JSON.stringify({ action: 'profile_update', fields: Object.keys(updateData) }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
