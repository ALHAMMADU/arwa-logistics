import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed';

export async function POST(request: Request) {
  // Disable seed endpoint in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Seed endpoint is not available in production' },
      { status: 403 }
    );
  }

  // In development, allow seeding without auth for convenience

  try {
    const result = await seedDatabase();
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
