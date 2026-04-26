import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rbac';
import crypto from 'crypto';

// POST /api/auth/forgot-password - Request a password reset token
export async function POST(request: Request) {
  try {
    // Rate limiting (public endpoint - stricter limit)
    const rateLimitResult = await rateLimit(request, { maxRequests: 5, windowMs: 60 * 1000 });
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.user.findFirst({ where: { email } });

    if (user) {
      // Generate a reset token (32 bytes random hex)
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store the reset token
      await db.passwordReset.create({
        data: {
          email,
          token,
          expiresAt,
        },
      });

      // In a production app, you would send an email with the reset link here
      // For now, we log it (the token is returned for demo/testing purposes)
      console.log(`[PASSWORD_RESET] Token generated for ${email}: ${token}`);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      data: {
        message: 'If an account with that email exists, a password reset link has been sent.',
      },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
