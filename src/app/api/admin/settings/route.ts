import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAccess } from '@/lib/rbac';

// GET /api/admin/settings - Get all settings
export async function GET(request: Request) {
  try {
    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;

    const settings = await db.setting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    // Default settings if empty
    const defaults: Record<string, string> = {
      company_name: 'ARWA LOGISTICS',
      default_language: 'en',
      default_currency: 'USD',
      handling_fee_percent: '5',
      insurance_fee_percent: '1',
      email_notifications: 'true',
      sms_notifications: 'false',
      maintenance_mode: 'false',
      max_shipment_weight: '1000',
      support_email: 'support@arwalogistics.com',
      company_phone: '+966 50 000 0000',
      company_address: 'Riyadh, Saudi Arabia',
    };

    // Merge defaults with saved settings
    const result = { ...defaults, ...settingsMap };

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/settings - Update settings
export async function PUT(request: Request) {
  try {
    const access = checkAccess(request, { roles: ['ADMIN'] });
    if (!access.allowed) return access.response;

    const body = await request.json();
    const { settings } = body;

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { success: false, error: 'Settings array is required' },
        { status: 400 }
      );
    }

    // Upsert each setting
    const results = await Promise.all(
      settings.map(({ key, value }: { key: string; value: string }) =>
        db.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
