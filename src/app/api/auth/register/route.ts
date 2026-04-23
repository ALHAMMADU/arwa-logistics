import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { rateLimit, createAuditLog, getClientIp } from '@/lib/rbac';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    // Rate limiting (public endpoint)
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const { email, password, name, phone, company, role } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: 'Email, password, and name are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
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
        name,
        phone: phone || null,
        company: company || null,
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
