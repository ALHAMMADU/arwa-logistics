import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

export async function GET(request: Request) {
  const rateLimitResult = await rateLimit(request, { windowMs: 60 * 1000, maxRequests: 30 });
  if (rateLimitResult) return rateLimitResult;

  // Rate calculator is available to authenticated users and also public (with limited data)
  const access = checkAccess(request);
  const isAuthenticated = access.allowed;

  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const weightParam = searchParams.get('weight');
    const method = searchParams.get('method'); // AIR / SEA / LAND (optional)
    const type = searchParams.get('type'); // PARCEL / LCL / FCL (optional)

    if (!country || !weightParam) {
      return NextResponse.json(
        { success: false, error: 'Country and weight are required' },
        { status: 400 }
      );
    }

    const weight = parseFloat(weightParam);
    if (isNaN(weight) || weight <= 0) {
      return NextResponse.json(
        { success: false, error: 'Weight must be a positive number' },
        { status: 400 }
      );
    }

    // Find all active routes for the destination country
    const routes = await db.shippingRoute.findMany({
      where: {
        destinationCountry: country,
        active: true,
      },
    });

    // Build rate options from routes
    const rateOptions: Array<{
      routeName: string;
      method: string;
      pricePerKg: number;
      totalCost: number;
      estimatedDays: { min: number; max: number };
      estimatedDeliveryDate: string;
      note?: string;
    }> = [];

    for (const route of routes) {
      // Determine which methods are available for this route
      const availableMethods: string[] = [];
      if (route.allowedAir) availableMethods.push('AIR');
      if (route.allowedSea) availableMethods.push('SEA');
      if (route.allowedLand) availableMethods.push('LAND');

      // Filter by requested method if specified
      const methodsToShow = method
        ? availableMethods.filter((m) => m === method.toUpperCase())
        : availableMethods;

      for (const m of methodsToShow) {
        const totalCost = Math.round(route.pricePerKg * weight * 100) / 100;
        const now = new Date();
        const minDate = new Date(now.getTime() + route.estimatedDaysMin * 24 * 60 * 60 * 1000);
        const maxDate = new Date(now.getTime() + route.estimatedDaysMax * 24 * 60 * 60 * 1000);

        const option: (typeof rateOptions)[number] = {
          routeName: route.name,
          method: m,
          pricePerKg: route.pricePerKg,
          totalCost,
          estimatedDays: { min: route.estimatedDaysMin, max: route.estimatedDaysMax },
          estimatedDeliveryDate: `${minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        };

        // Add note if type is PARCEL and weight > 30
        if (type?.toUpperCase() === 'PARCEL' && weight > 30) {
          option.note = 'For parcels over 30kg, LCL shipping may offer better value.';
        }

        rateOptions.push(option);
      }
    }

    // Sort by totalCost ascending
    rateOptions.sort((a, b) => a.totalCost - b.totalCost);

    return NextResponse.json({ success: true, data: rateOptions });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
