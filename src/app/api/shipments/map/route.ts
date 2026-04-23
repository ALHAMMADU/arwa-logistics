import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, checkAccess } from '@/lib/rbac';

// Mapping of common destination cities/countries to approximate lat/lng coordinates
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Saudi Arabia
  'Riyadh': { lat: 24.7136, lng: 46.6753 },
  'Jeddah': { lat: 21.4858, lng: 39.1925 },
  'Dammam': { lat: 26.3927, lng: 49.9777 },
  'Mecca': { lat: 21.3891, lng: 39.8579 },
  'Medina': { lat: 24.5247, lng: 39.5692 },
  'Khobar': { lat: 26.2172, lng: 50.1971 },
  // UAE
  'Dubai': { lat: 25.2048, lng: 55.2708 },
  'Abu Dhabi': { lat: 24.4539, lng: 54.3773 },
  'Sharjah': { lat: 25.3463, lng: 55.4209 },
  // Kuwait
  'Kuwait City': { lat: 29.3759, lng: 47.9774 },
  // Bahrain
  'Manama': { lat: 26.2285, lng: 50.5860 },
  // Qatar
  'Doha': { lat: 25.2854, lng: 51.5310 },
  // Oman
  'Muscat': { lat: 23.5880, lng: 58.3829 },
  // Egypt
  'Cairo': { lat: 30.0444, lng: 31.2357 },
  'Alexandria': { lat: 31.2001, lng: 29.9187 },
  // Iraq
  'Baghdad': { lat: 33.3152, lng: 44.3661 },
  // Jordan
  'Amman': { lat: 31.9454, lng: 35.9284 },
  // Lebanon
  'Beirut': { lat: 33.8938, lng: 35.5018 },
  // Turkey
  'Istanbul': { lat: 41.0082, lng: 28.9784 },
  'Ankara': { lat: 39.9334, lng: 32.8597 },
  // Morocco
  'Casablanca': { lat: 33.5731, lng: -7.5898 },
  'Rabat': { lat: 34.0209, lng: -6.8416 },
  // Tunisia
  'Tunis': { lat: 36.8065, lng: 10.1815 },
  // Algeria
  'Algiers': { lat: 36.7538, lng: 3.0588 },
  // Sudan
  'Khartoum': { lat: 15.5007, lng: 32.5599 },
  // Yemen
  'Sanaa': { lat: 15.3694, lng: 44.1910 },
  // Libya
  'Tripoli': { lat: 32.8872, lng: 13.1913 },
  // Syria
  'Damascus': { lat: 33.5138, lng: 36.2765 },
  // Palestine
  'Gaza': { lat: 31.3547, lng: 34.3088 },
  // China (origin)
  'Guangzhou': { lat: 23.1291, lng: 113.2644 },
  'Yiwu': { lat: 29.3058, lng: 120.0750 },
  'Shenzhen': { lat: 22.5431, lng: 114.0579 },
  'Shanghai': { lat: 31.2304, lng: 121.4737 },
  'Beijing': { lat: 39.9042, lng: 116.4074 },
  'Ningbo': { lat: 29.8683, lng: 121.5440 },
};

// Fallback country-level coordinates
const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Saudi Arabia': { lat: 23.8859, lng: 45.0792 },
  'UAE': { lat: 23.4241, lng: 53.8478 },
  'United Arab Emirates': { lat: 23.4241, lng: 53.8478 },
  'Kuwait': { lat: 29.3759, lng: 47.9774 },
  'Bahrain': { lat: 26.0667, lng: 50.5577 },
  'Qatar': { lat: 25.3548, lng: 51.1839 },
  'Oman': { lat: 21.4735, lng: 55.9754 },
  'Egypt': { lat: 26.8206, lng: 30.8025 },
  'Iraq': { lat: 33.2232, lng: 43.6793 },
  'Jordan': { lat: 30.5852, lng: 36.2384 },
  'Lebanon': { lat: 33.8547, lng: 35.8623 },
  'Turkey': { lat: 38.9637, lng: 35.2433 },
  'Morocco': { lat: 31.7917, lng: -7.0926 },
  'Tunisia': { lat: 33.8869, lng: 9.5375 },
  'Algeria': { lat: 28.0339, lng: 1.6596 },
  'Sudan': { lat: 12.8628, lng: 30.2176 },
  'Yemen': { lat: 15.5527, lng: 48.5164 },
  'Libya': { lat: 26.3351, lng: 17.2283 },
  'Syria': { lat: 34.8021, lng: 38.9968 },
  'Palestine': { lat: 31.9522, lng: 35.2332 },
  'China': { lat: 35.8617, lng: 104.1954 },
};

// Origin coordinates (China - Yiwu/Guangzhou area)
const ORIGIN_COORDINATES = { lat: 29.0, lng: 118.0 };

// Active statuses for map display
const ACTIVE_STATUSES = [
  'DISPATCHED',
  'IN_TRANSIT',
  'ARRIVED_AT_DESTINATION',
  'CUSTOMS_CLEARANCE',
  'OUT_FOR_DELIVERY',
];

function getCoordinates(city: string, country: string): { lat: number; lng: number } {
  // Try city first
  if (CITY_COORDINATES[city]) return CITY_COORDINATES[city];
  // Try country
  if (COUNTRY_COORDINATES[country]) return COUNTRY_COORDINATES[country];
  // Default to Middle East center
  return { lat: 25.0, lng: 45.0 };
}

function simulateCurrentLocation(
  status: string,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): { lat: number; lng: number; label: string } {
  switch (status) {
    case 'DISPATCHED': {
      const t = 0.1;
      return {
        lat: origin.lat + (destination.lat - origin.lat) * t,
        lng: origin.lng + (destination.lng - origin.lng) * t,
        label: 'Departed China',
      };
    }
    case 'IN_TRANSIT': {
      // Simulate being roughly halfway
      const t = 0.35 + Math.random() * 0.25;
      return {
        lat: origin.lat + (destination.lat - origin.lat) * t,
        lng: origin.lng + (destination.lng - origin.lng) * t,
        label: 'In Transit',
      };
    }
    case 'ARRIVED_AT_DESTINATION': {
      return { lat: destination.lat, lng: destination.lng, label: 'Arrived at Destination' };
    }
    case 'CUSTOMS_CLEARANCE': {
      return { lat: destination.lat + 0.05, lng: destination.lng + 0.05, label: 'Customs Clearance' };
    }
    case 'OUT_FOR_DELIVERY': {
      return { lat: destination.lat + 0.02, lng: destination.lng - 0.02, label: 'Out for Delivery' };
    }
    default:
      return { lat: origin.lat, lng: origin.lng, label: 'At Origin' };
  }
}

export async function GET(request: Request) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    // Any authenticated user
    const access = checkAccess(request);
    if (!access.allowed) return access.response;
    const session = access.session;

    const { searchParams } = new URL(request.url);
    const method = searchParams.get('method'); // AIR, SEA, LAND filter

    // Build where clause - only active shipments
    let where: any = {
      status: { in: ACTIVE_STATUSES },
    };

    // RBAC: customers see only their own, admin sees all
    if (session.role === 'CUSTOMER') {
      where.customerId = session.id;
    } else if (session.role === 'WAREHOUSE_STAFF') {
      const warehouse = await db.warehouse.findFirst({ where: { managerId: session.id } });
      if (warehouse) where.warehouseId = warehouse.id;
    }

    if (method) where.shippingMethod = method;

    const shipments = await db.shipment.findMany({
      where,
      include: {
        route: { select: { originCountry: true } },
        payments: { select: { status: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100, // Limit for performance
    });

    const mapData = shipments.map(s => {
      const destination = getCoordinates(s.destinationCity, s.destinationCountry);
      const originCountry = s.route?.originCountry || 'China';
      const origin = originCountry === 'China' ? ORIGIN_COORDINATES : (COUNTRY_COORDINATES[originCountry] || ORIGIN_COORDINATES);
      const currentLocation = simulateCurrentLocation(s.status, origin, destination);
      const hasCompletedPayment = s.payments?.some((p: any) => p.status === 'COMPLETED');

      return {
        id: s.id,
        shipmentId: s.shipmentId,
        trackingNumber: s.trackingNumber,
        status: s.status,
        destinationCountry: s.destinationCountry,
        destinationCity: s.destinationCity,
        shippingMethod: s.shippingMethod,
        originCountry,
        currentLocation,
        coordinates: destination,
        originCoordinates: origin,
        hasCompletedPayment,
      };
    });

    // Compute stats
    const stats = {
      active: mapData.length,
      inTransit: mapData.filter(s => s.status === 'IN_TRANSIT').length,
      dispatched: mapData.filter(s => s.status === 'DISPATCHED').length,
      arrived: mapData.filter(s => ['ARRIVED_AT_DESTINATION', 'CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY'].includes(s.status)).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        shipments: mapData,
        stats,
      },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
