import { NextResponse } from 'next/server';
import { testSMTPConnection, isSMTPConfigured } from '@/lib/smtp';
import { rateLimit, checkAccess } from '@/lib/rbac';

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const access = checkAccess(request, { roles: ['ADMIN'] });
  if (!access.allowed) return access.response;

  const configured = await isSMTPConfigured();
  if (!configured) {
    return NextResponse.json({
      success: false,
      error: 'SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in environment variables.',
    }, { status: 400 });
  }

  const result = await testSMTPConnection();

  if (result.success) {
    return NextResponse.json({ success: true, message: 'SMTP connection successful' });
  } else {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
}
