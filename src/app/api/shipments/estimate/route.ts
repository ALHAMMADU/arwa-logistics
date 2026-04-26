import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const access = checkAccess(request);
  if (!access.allowed) return access.response;

  try {
    const body = await request.json();
    const { destinationCountry, destinationCity, weight, shippingMethod, shipmentType, shipmentValue } = body;

    // Validate required fields
    if (!destinationCountry) {
      return NextResponse.json({ success: false, error: 'Destination country is required' }, { status: 400 });
    }
    if (!weight || parseFloat(weight) <= 0) {
      return NextResponse.json({ success: false, error: 'Valid weight is required' }, { status: 400 });
    }
    if (!shipmentValue || parseFloat(shipmentValue) <= 0) {
      return NextResponse.json({ success: false, error: 'Valid shipment value is required' }, { status: 400 });
    }

    const weightNum = parseFloat(weight);
    const valueNum = parseFloat(shipmentValue);

    // Find matching routes
    const whereClause: any = {
      destinationCountry,
      active: true,
    };

    // If city is specified, filter by city (including null city routes)
    if (destinationCity) {
      whereClause.OR = [
        { destinationCity: destinationCity },
        { destinationCity: null },
      ];
    }

    // Filter by shipping method if specified
    if (shippingMethod) {
      if (shippingMethod === 'AIR') whereClause.allowedAir = true;
      else if (shippingMethod === 'SEA') whereClause.allowedSea = true;
      else if (shippingMethod === 'LAND') whereClause.allowedLand = true;
    }

    const routes = await db.shippingRoute.findMany({ where: whereClause });

    // Calculate estimates for each route
    const estimates: any[] = [];

    for (const route of routes) {
      // Determine which methods are available for this route
      const availableMethods: string[] = [];
      if (route.allowedAir) availableMethods.push('AIR');
      if (route.allowedSea) availableMethods.push('SEA');
      if (route.allowedLand) availableMethods.push('LAND');

      // Filter by requested method if specified
      const methodsToShow = shippingMethod
        ? availableMethods.filter((m) => m === shippingMethod.toUpperCase())
        : availableMethods;

      for (const method of methodsToShow) {
        // baseCost: weight * route.pricePerKg
        const baseCost = Math.round(weightNum * route.pricePerKg * 100) / 100;

        // handlingFee: 5% of baseCost
        const handlingFee = Math.round(baseCost * 0.05 * 100) / 100;

        // insurance: 1% of shipmentValue
        const insurance = Math.round(valueNum * 0.01 * 100) / 100;

        // customsFee: fixed $25 for SEA, $15 for AIR, $10 for LAND
        let customsFee = 10;
        if (method === 'SEA') customsFee = 25;
        else if (method === 'AIR') customsFee = 15;
        else if (method === 'LAND') customsFee = 10;

        // totalCost: sum of all above
        const totalCost = Math.round((baseCost + handlingFee + insurance + customsFee) * 100) / 100;

        estimates.push({
          routeId: route.id,
          routeName: route.name,
          originCountry: route.originCountry,
          destinationCountry: route.destinationCountry,
          destinationCity: route.destinationCity,
          method,
          shipmentType: shipmentType || 'PARCEL',
          pricePerKg: route.pricePerKg,
          breakdown: {
            baseCost,
            handlingFee,
            insurance,
            customsFee,
          },
          totalCost,
          estimatedDays: {
            min: route.estimatedDaysMin,
            max: route.estimatedDaysMax,
          },
        });
      }
    }

    // Sort by totalCost ascending
    estimates.sort((a, b) => a.totalCost - b.totalCost);

    return NextResponse.json({ success: true, data: estimates });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
