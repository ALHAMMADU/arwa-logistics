import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword, needsRehash, generateToken } from '@/lib/auth';
import { rateLimit, createAuditLog, getClientIp } from '@/lib/rbac';
import { setCookie } from '@/lib/cookies';

// Dummy hash for timing attack prevention — always perform bcrypt comparison
const DUMMY_HASH = '$2a$12$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function POST(request: Request) {
  try {
    // Rate limiting (public endpoint)
    const rateLimitResult = await rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const { email, password } = body;

    // Email format validation
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
    }

    const user = await db.user.findFirst({ where: { email } });

    // Always perform bcrypt comparison to prevent timing attacks
    const hashToCompare = user ? user.password : DUMMY_HASH;
    const isValid = await verifyPassword(password, hashToCompare);

    if (!user || !isValid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.active) {
      return NextResponse.json({ success: false, error: 'Account is deactivated' }, { status: 403 });
    }

    // If password hash needs rehashing (old SHA-256), re-hash with bcrypt
    if (needsRehash(user.password)) {
      const newHash = await hashPassword(password);
      await db.user.update({
        where: { id: user.id },
        data: { password: newHash },
      });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    // Audit log for login
    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      details: JSON.stringify({ email: user.email, role: user.role }),
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, company: user.company },
        token, // Keep token in response for backward compatibility with mobile/API clients
      },
    }, {
      headers: {
        'Set-Cookie': setCookie(token),
      },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
