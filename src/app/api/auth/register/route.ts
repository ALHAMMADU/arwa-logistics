import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { rateLimit, createAuditLog, getClientIp } from '@/lib/rbac';
import { sendWelcomeEmail } from '@/lib/email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 200;

export async function POST(request: Request) {
  try {
    // Rate limiting (public endpoint)
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const { email, password, name, phone, company, role } = body;

    // Input validation
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
    }

    // Stronger password policy: min 8 chars, at least one uppercase, one lowercase, one number
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ success: false, error: 'Password must contain uppercase, lowercase, and a number' }, { status: 400 });
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ success: false, error: 'Name is too long' }, { status: 400 });
    }

    const existing = await db.user.findFirst({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 409 });
    }

    // Only allow CUSTOMER or WAREHOUSE_STAFF roles on registration (ADMIN is internal only)
    const allowedRoles = ['CUSTOMER', 'WAREHOUSE_STAFF'];
    const userRole = role && allowedRoles.includes(role) ? role : 'CUSTOMER';

    // Use async bcrypt hashPassword
    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name.trim(),
        phone: phone?.trim() || null,
        company: company?.trim() || null,
        role: userRole,
      },
    });

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    // Audit log for registration
    await createAuditLog({
      userId: user.id,
      action: 'REGISTER',
      entity: 'User',
      entityId: user.id,
      details: JSON.stringify({ email: user.email, role: userRole }),
      ipAddress: getClientIp(request),
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('[EMAIL] Non-blocking error in sendWelcomeEmail:', err.message);
    });

    return NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, company: user.company },
        token,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
