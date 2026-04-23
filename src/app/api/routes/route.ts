import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const routes = await db.shippingRoute.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: routes });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;

    const body = await request.json();
    const { name, originCountry, destinationCountry, destinationCity, pricePerKg, estimatedDaysMin, estimatedDaysMax, allowedAir, allowedSea, allowedLand } = body;

    if (!name || !originCountry || !destinationCountry || !pricePerKg) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const route = await db.shippingRoute.create({
      data: {
        name,
        originCountry,
        destinationCountry,
        destinationCity: destinationCity || null,
        pricePerKg: parseFloat(pricePerKg),
        estimatedDaysMin: estimatedDaysMin || 5,
        estimatedDaysMax: estimatedDaysMax || 10,
        allowedAir: allowedAir !== false,
        allowedSea: allowedSea !== false,
        allowedLand: allowedLand === true,
      },
    });

    return NextResponse.json({ success: true, data: route }, { status: 201 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
