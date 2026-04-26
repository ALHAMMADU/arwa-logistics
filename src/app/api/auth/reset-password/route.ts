import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { rateLimit, createAuditLog, getClientIp } from '@/lib/rbac';

// POST /api/auth/reset-password - Reset password using token
export async function POST(request: Request) {
  try {
    // Rate limiting (public endpoint - stricter limit)
    const rateLimitResult = await rateLimit(request, { maxRequests: 5, windowMs: 60 * 1000 });
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Find the reset token
    const resetRecord = await db.passwordReset.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token is expired or already used
    if (resetRecord.used || resetRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Find the user by email
    const user = await db.user.findFirst({
      where: { email: resetRecord.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash the new password with bcrypt
    const hashedPassword = await hashPassword(newPassword);

    // Update user password and mark token as used
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      db.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ]);

    // Delete all other unused reset tokens for this email
    await db.passwordReset.deleteMany({
      where: {
        email: resetRecord.email,
        used: false,
        id: { not: resetRecord.id },
      },
    });

    // Audit log for password reset
    await createAuditLog({
      userId: user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      details: JSON.stringify({ action: 'password_reset' }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Password has been reset successfully' },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
