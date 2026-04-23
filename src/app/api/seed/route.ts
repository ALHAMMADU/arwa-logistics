import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed';
import { rateLimit, checkAccess } from '@/lib/rbac';

export async function POST(request: Request) {
  const rateLimitResult = rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const access = checkAccess(request, { roles: ['ADMIN'] });
  if (!access.allowed) return access.response;

  try {
    const result = await seedDatabase();
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
