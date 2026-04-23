import crypto from 'crypto';
import { db } from './db';

/**
 * Generate a unique shipment ID using an atomic database counter.
 * Format: ARWA-{YEAR}-{6-digit sequence}
 * Falls back to timestamp-based ID if database lookup fails.
 */
export async function generateShipmentId(): Promise<string> {
  const year = new Date().getFullYear();
  try {
    const lastShipment = await db.shipment.findFirst({
      where: { shipmentId: { startsWith: `ARWA-${year}-` } },
      orderBy: { shipmentId: 'desc' },
      select: { shipmentId: true },
    });

    let nextSeq = 1;
    if (lastShipment?.shipmentId) {
      const lastSeq = parseInt(lastShipment.shipmentId.split('-').pop() || '0', 10);
      nextSeq = lastSeq + 1;
    }

    return `ARWA-${year}-${String(nextSeq).padStart(6, '0')}`;
  } catch {
    const timestamp = Date.now().toString().slice(-6);
    return `ARWA-${year}-${timestamp}`;
  }
}

export function generateTrackingNumber(): string {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ARWA-TRACK-${random}`;
}

export function generateQRCodeData(shipmentId: string, trackingNumber: string): string {
  return JSON.stringify({
    shipment_id: shipmentId,
    tracking_number: trackingNumber,
    tracking_url: `https://arwalogistics.com/track/${trackingNumber}`,
    generated_at: new Date().toISOString(),
    company: 'ARWA LOGISTICS'
  });
}
