import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/auth';
import { rateLimit, checkAccess, createAuditLog, getClientIp } from '@/lib/rbac';
import { sendPasswordChangeEmail } from '@/lib/email';

// POST /api/auth/change-password - Change user password
export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    // Any authenticated user
    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Fetch user with password
    const user = await db.user.findUnique({
      where: { id: session.id },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Verify current password (async with bcrypt support)
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash and update new password (async with bcrypt)
    const hashedPassword = await hashPassword(newPassword);
    await db.user.update({
      where: { id: session.id },
      data: { password: hashedPassword },
    });

    // Audit log for password change
    await createAuditLog({
      userId: session.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: session.id,
      details: JSON.stringify({ action: 'password_change' }),
      ipAddress: getClientIp(request),
    });

    // Send password change notification email (non-blocking)
    sendPasswordChangeEmail(session.email, session.id ? (await db.user.findUnique({ where: { id: session.id }, select: { name: true } }))?.name || 'User' : 'User').catch((err) => {
      console.error('[EMAIL] Non-blocking error in sendPasswordChangeEmail:', err.message);
    });

    return NextResponse.json({ success: true, data: { message: 'Password updated successfully' } });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
