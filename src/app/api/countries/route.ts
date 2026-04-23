import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const whereClause: any = {};
    if (activeOnly) {
      whereClause.active = true;
    }

    const countries = await db.country.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: { name: 'asc' },
    });

    const shipmentCounts = await db.shipment.groupBy({
      by: ['destinationCountry'],
      _count: { id: true },
    });

    const countMap = new Map<string, number>();
    for (const sc of shipmentCounts) {
      countMap.set(sc.destinationCountry, sc._count.id);
    }

    const enhancedCountries = countries.map((country) => ({
      ...country,
      shipmentCount: countMap.get(country.name) || 0,
    }));

    return NextResponse.json({ success: true, data: enhancedCountries });
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
    const { name, code, supportsAir, supportsSea, supportsLand } = body;

    if (!name || !code) {
      return NextResponse.json({ success: false, error: 'Name and code are required' }, { status: 400 });
    }

    const normalizedCode = code.toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalizedCode)) {
      return NextResponse.json(
        { success: false, error: 'Code must be a valid ISO 3166-1 alpha-2 code (2 letters)' },
        { status: 400 }
      );
    }

    const existingCountry = await db.country.findFirst({
      where: { code: normalizedCode },
    });
    if (existingCountry) {
      return NextResponse.json(
        { success: false, error: `A country with code "${normalizedCode}" already exists (${existingCountry.name})` },
        { status: 409 }
      );
    }

    const existingName = await db.country.findFirst({
      where: { name: { equals: name } },
    });
    if (existingName) {
      return NextResponse.json(
        { success: false, error: `A country with name "${name}" already exists` },
        { status: 409 }
      );
    }

    const country = await db.country.create({
      data: {
        name,
        code: normalizedCode,
        supportsAir: supportsAir || false,
        supportsSea: supportsSea || false,
        supportsLand: supportsLand || false,
      },
    });

    return NextResponse.json({ success: true, data: { ...country, shipmentCount: 0 } }, { status: 201 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
