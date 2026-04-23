import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function seedDatabase() {
  // Check if already seeded
  const existingAdmin = await db.user.findFirst({ where: { email: 'admin@arwalogistics.com' } });
  if (existingAdmin) {
    return { message: 'Database already seeded', seeded: false };
  }

  // Create users
  const admin = await db.user.create({
    data: { email: 'admin@arwalogistics.com', password: await hashPassword('admin123'), name: 'ARWA Admin', role: 'ADMIN', phone: '+8613800138000', company: 'ARWA LOGISTICS' }
  });

  const customer1 = await db.user.create({
    data: { email: 'customer@arwalogistics.com', password: await hashPassword('customer123'), name: 'Ahmed Al-Rashid', role: 'CUSTOMER', phone: '+966501234567', company: 'Al-Rashid Trading' }
  });

  const customer2 = await db.user.create({
    data: { email: 'omar@arwalogistics.com', password: await hashPassword('customer123'), name: 'Omar Hassan', role: 'CUSTOMER', phone: '+971501234567', company: 'Hassan Imports LLC' }
  });

  const warehouseStaff1 = await db.user.create({
    data: { email: 'warehouse@arwalogistics.com', password: await hashPassword('warehouse123'), name: 'Li Wei', role: 'WAREHOUSE_STAFF', phone: '+8613912345678' }
  });

  const warehouseStaff2 = await db.user.create({
    data: { email: 'warehouse2@arwalogistics.com', password: await hashPassword('warehouse123'), name: 'Zhang Ming', role: 'WAREHOUSE_STAFF', phone: '+8613923456789' }
  });

  // Create warehouses
  const gzWarehouse = await db.warehouse.create({
    data: { name: 'Guangzhou Warehouse', city: 'Guangzhou', address: 'No. 88 Baiyun District, Guangzhou, China', capacity: 15000, managerId: warehouseStaff1.id }
  });

  const ywWarehouse = await db.warehouse.create({
    data: { name: 'Yiwu Warehouse', city: 'Yiwu', address: 'No. 166 Yiwu International Trade City, Yiwu, China', capacity: 12000, managerId: warehouseStaff2.id }
  });

  const szWarehouse = await db.warehouse.create({
    data: { name: 'Shenzhen Warehouse', city: 'Shenzhen', address: 'No. 55 Baoan District, Shenzhen, China', capacity: 20000 }
  });

  // Create countries
  const countries = [
    { name: 'Saudi Arabia', code: 'SA', supportsAir: true, supportsSea: true, supportsLand: false },
    { name: 'United Arab Emirates', code: 'AE', supportsAir: true, supportsSea: true, supportsLand: true },
    { name: 'Kuwait', code: 'KW', supportsAir: true, supportsSea: true, supportsLand: true },
    { name: 'Qatar', code: 'QA', supportsAir: true, supportsSea: true, supportsLand: false },
    { name: 'Bahrain', code: 'BH', supportsAir: true, supportsSea: true, supportsLand: true },
    { name: 'Oman', code: 'OM', supportsAir: true, supportsSea: true, supportsLand: true },
    { name: 'United Kingdom', code: 'GB', supportsAir: true, supportsSea: true, supportsLand: false },
    { name: 'Germany', code: 'DE', supportsAir: true, supportsSea: true, supportsLand: false },
    { name: 'France', code: 'FR', supportsAir: true, supportsSea: true, supportsLand: false },
    { name: 'United States', code: 'US', supportsAir: true, supportsSea: true, supportsLand: false },
    { name: 'Canada', code: 'CA', supportsAir: true, supportsSea: true, supportsLand: false },
    { name: 'Australia', code: 'AU', supportsAir: true, supportsSea: true, supportsLand: false },
    { name: 'Turkey', code: 'TR', supportsAir: true, supportsSea: true, supportsLand: true },
    { name: 'Egypt', code: 'EG', supportsAir: true, supportsSea: true, supportsLand: false },
    { name: 'Morocco', code: 'MA', supportsAir: true, supportsSea: true, supportsLand: false },
    { name: 'India', code: 'IN', supportsAir: true, supportsSea: true, supportsLand: true },
    { name: 'Brazil', code: 'BR', supportsAir: true, supportsSea: true, supportsLand: false },
    { name: 'Nigeria', code: 'NG', supportsAir: true, supportsSea: true, supportsLand: false },
  ];

  for (const c of countries) {
    await db.country.create({ data: c });
  }

  // Create shipping routes
  const routes = [
    { name: 'China → Saudi Arabia', originCountry: 'China', destinationCountry: 'Saudi Arabia', destinationCity: 'Riyadh', pricePerKg: 8.5, estimatedDaysMin: 5, estimatedDaysMax: 7, allowedAir: true, allowedSea: true, allowedLand: false },
    { name: 'China → UAE', originCountry: 'China', destinationCountry: 'United Arab Emirates', destinationCity: 'Dubai', pricePerKg: 7.0, estimatedDaysMin: 4, estimatedDaysMax: 6, allowedAir: true, allowedSea: true, allowedLand: true },
    { name: 'China → UK', originCountry: 'China', destinationCountry: 'United Kingdom', destinationCity: 'London', pricePerKg: 9.0, estimatedDaysMin: 6, estimatedDaysMax: 9, allowedAir: true, allowedSea: true, allowedLand: false },
    { name: 'China → USA', originCountry: 'China', destinationCountry: 'United States', destinationCity: 'New York', pricePerKg: 10.0, estimatedDaysMin: 5, estimatedDaysMax: 8, allowedAir: true, allowedSea: true, allowedLand: false },
    { name: 'China → Germany', originCountry: 'China', destinationCountry: 'Germany', destinationCity: 'Berlin', pricePerKg: 8.0, estimatedDaysMin: 6, estimatedDaysMax: 9, allowedAir: true, allowedSea: true, allowedLand: false },
    { name: 'China → Kuwait', originCountry: 'China', destinationCountry: 'Kuwait', destinationCity: 'Kuwait City', pricePerKg: 7.5, estimatedDaysMin: 4, estimatedDaysMax: 7, allowedAir: true, allowedSea: true, allowedLand: true },
    { name: 'China → Qatar', originCountry: 'China', destinationCountry: 'Qatar', destinationCity: 'Doha', pricePerKg: 8.0, estimatedDaysMin: 5, estimatedDaysMax: 7, allowedAir: true, allowedSea: true, allowedLand: false },
    { name: 'China → Australia', originCountry: 'China', destinationCountry: 'Australia', destinationCity: 'Sydney', pricePerKg: 9.5, estimatedDaysMin: 5, estimatedDaysMax: 8, allowedAir: true, allowedSea: true, allowedLand: false },
    { name: 'China → Turkey', originCountry: 'China', destinationCountry: 'Turkey', destinationCity: 'Istanbul', pricePerKg: 7.0, estimatedDaysMin: 5, estimatedDaysMax: 8, allowedAir: true, allowedSea: true, allowedLand: true },
    { name: 'China → Egypt', originCountry: 'China', destinationCountry: 'Egypt', destinationCity: 'Cairo', pricePerKg: 7.5, estimatedDaysMin: 5, estimatedDaysMax: 8, allowedAir: true, allowedSea: true, allowedLand: false },
  ];

  const createdRoutes: any[] = [];
  for (const r of routes) {
    const route = await db.shippingRoute.create({ data: r });
    createdRoutes.push(route);
  }

  // Create demo shipments
  const shipments = [
    { senderName: 'Ahmed Al-Rashid', senderPhone: '+966501234567', receiverName: 'Mohammed Al-Saud', receiverPhone: '+966551234567', receiverAddress: 'King Fahd Road, Riyadh 12345', destinationCountry: 'Saudi Arabia', destinationCity: 'Riyadh', weight: 25.5, length: 60, width: 40, height: 35, productDescription: 'Electronics - Mobile Phone Accessories', shipmentValue: 3500, shippingMethod: 'AIR' as const, shipmentType: 'PARCEL' as const, status: 'IN_TRANSIT' as const, customerId: customer1.id, warehouseId: gzWarehouse.id, routeId: createdRoutes[0].id },
    { senderName: 'Ahmed Al-Rashid', senderPhone: '+966501234567', receiverName: 'Fatima Al-Rashid', receiverPhone: '+971501234567', receiverAddress: 'Sheikh Zayed Road, Dubai 54321', destinationCountry: 'United Arab Emirates', destinationCity: 'Dubai', weight: 150, length: 120, width: 80, height: 100, productDescription: 'Textiles - Silk Fabrics', shipmentValue: 8500, shippingMethod: 'SEA' as const, shipmentType: 'LCL' as const, status: 'RECEIVED_AT_WAREHOUSE' as const, customerId: customer1.id, warehouseId: gzWarehouse.id, routeId: createdRoutes[1].id },
    { senderName: 'Omar Hassan', senderPhone: '+971501234567', receiverName: 'Hassan Imports LLC', receiverPhone: '+971551234567', receiverAddress: 'Jebel Ali Free Zone, Dubai', destinationCountry: 'United Arab Emirates', destinationCity: 'Dubai', weight: 5000, length: 600, width: 240, height: 260, productDescription: 'Furniture - Office Chairs', shipmentValue: 45000, shippingMethod: 'SEA' as const, shipmentType: 'FCL' as const, status: 'DISPATCHED' as const, customerId: customer2.id, warehouseId: ywWarehouse.id, routeId: createdRoutes[1].id },
    { senderName: 'Ahmed Al-Rashid', senderPhone: '+966501234567', receiverName: 'John Smith', receiverPhone: '+44201234567', receiverAddress: '25 Oxford Street, London W1D 1AR', destinationCountry: 'United Kingdom', destinationCity: 'London', weight: 12, length: 50, width: 30, height: 20, productDescription: 'Clothing - Traditional Garments', shipmentValue: 2200, shippingMethod: 'AIR' as const, shipmentType: 'PARCEL' as const, status: 'CREATED' as const, customerId: customer1.id, warehouseId: szWarehouse.id, routeId: createdRoutes[2].id },
    { senderName: 'Omar Hassan', senderPhone: '+971501234567', receiverName: 'Warehouse Team', receiverPhone: '+971551234567', receiverAddress: 'Industrial Area, Kuwait City', destinationCountry: 'Kuwait', destinationCity: 'Kuwait City', weight: 350, length: 200, width: 150, height: 120, productDescription: 'Auto Parts - Brake Pads and Filters', shipmentValue: 12000, shippingMethod: 'LAND' as const, shipmentType: 'LCL' as const, status: 'CUSTOMS_CLEARANCE' as const, customerId: customer2.id, warehouseId: gzWarehouse.id, routeId: createdRoutes[5].id },
    { senderName: 'Ahmed Al-Rashid', senderPhone: '+966501234567', receiverName: 'Sarah Johnson', receiverPhone: '+12125551234', receiverAddress: '350 5th Ave, New York, NY 10118', destinationCountry: 'United States', destinationCity: 'New York', weight: 8, length: 40, width: 30, height: 15, productDescription: 'Jewelry - Gold Accessories', shipmentValue: 15000, shippingMethod: 'AIR' as const, shipmentType: 'PARCEL' as const, status: 'DELIVERED' as const, customerId: customer1.id, warehouseId: szWarehouse.id, routeId: createdRoutes[3].id },
  ];

  for (let i = 0; i < shipments.length; i++) {
    const s = shipments[i];
    const counter = 101 + i;
    const shipmentId = `ARWA-2026-${String(counter).padStart(6, '0')}`;
    const trackingNumber = `ARWA-TRACK-${String.fromCharCode(65 + i)}${String(counter).padStart(4, '0')}X`;
    const qrCodeData = JSON.stringify({
      shipment_id: shipmentId,
      tracking_number: trackingNumber,
      tracking_url: `https://arwalogistics.com/track/${trackingNumber}`,
      generated_at: new Date().toISOString(),
      company: 'ARWA LOGISTICS'
    });

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + Math.floor(Math.random() * 10) + 5);

    const shipment = await db.shipment.create({
      data: {
        shipmentId,
        trackingNumber,
        ...s,
        qrCodeData,
        estimatedDelivery,
      }
    });

    // Create tracking events based on status
    const statusFlow = ['CREATED', 'WAITING_WAREHOUSE_ARRIVAL', 'RECEIVED_AT_WAREHOUSE', 'PROCESSING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION', 'CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentStatusIndex = statusFlow.indexOf(s.status);
    const locations = ['Guangzhou, China', 'Yiwu, China', 'Shenzhen, China', 'Dubai, UAE', 'Riyadh, Saudi Arabia', 'London, UK', 'New York, USA', 'Kuwait City, Kuwait'];

    for (let j = 0; j <= currentStatusIndex; j++) {
      const eventTime = new Date();
      eventTime.setDate(eventTime.getDate() - (currentStatusIndex - j));
      eventTime.setHours(eventTime.getHours() - Math.floor(Math.random() * 12));

      await db.shipmentTracking.create({
        data: {
          shipmentId: shipment.id,
          status: statusFlow[j] as any,
          location: locations[Math.min(j, locations.length - 1)],
          notes: j === 0 ? 'Shipment created successfully' : `Status updated to ${statusFlow[j].replace(/_/g, ' ')}`,
          timestamp: eventTime,
        }
      });
    }
  }

  // Seed default settings
  const defaultSettings = [
    { key: 'company_name', value: 'ARWA LOGISTICS' },
    { key: 'default_language', value: 'en' },
    { key: 'default_currency', value: 'USD' },
    { key: 'handling_fee_percent', value: '5' },
    { key: 'insurance_fee_percent', value: '1' },
    { key: 'email_notifications', value: 'true' },
    { key: 'sms_notifications', value: 'false' },
    { key: 'maintenance_mode', value: 'false' },
  ];

  for (const setting of defaultSettings) {
    await db.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value },
    });
  }

  return { message: 'Database seeded successfully', seeded: true };
}
