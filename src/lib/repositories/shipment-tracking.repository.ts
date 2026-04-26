import { BaseRepository } from './base.repository';
import { db } from '../db';
import type { ShipmentTracking, Prisma } from '@prisma/client';

export class ShipmentTrackingRepository extends BaseRepository<ShipmentTracking, Prisma.ShipmentTrackingCreateInput, Prisma.ShipmentTrackingUpdateInput> {
  protected getModel() { return db.shipmentTracking; }

  async findByShipment(shipmentId: string) {
    return this.getModel().findMany({
      where: { shipmentId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async findLatestByShipment(shipmentId: string): Promise<ShipmentTracking | null> {
    const results = await this.getModel().findMany({
      where: { shipmentId },
      orderBy: { timestamp: 'desc' },
      take: 1,
    });
    return results[0] || null;
  }
}

export const shipmentTrackingRepository = new ShipmentTrackingRepository();
