import { NextResponse } from 'next/server';
import { clearCookie } from '@/lib/cookies';

export async function POST() {
  return NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    {
      headers: {
        'Set-Cookie': clearCookie(),
      },
    }
  );
}
