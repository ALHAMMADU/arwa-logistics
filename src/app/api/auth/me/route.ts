import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

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
      select: { id: true, email: true, name: true, role: true, phone: true, company: true, active: true, createdAt: true },
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
