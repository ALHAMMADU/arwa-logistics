import { BaseRepository } from './base.repository';
import { db } from '../db';
import type { ShipmentPhoto, Prisma } from '@prisma/client';

export class ShipmentPhotoRepository extends BaseRepository<ShipmentPhoto, Prisma.ShipmentPhotoCreateInput, Prisma.ShipmentPhotoUpdateInput> {
  protected getModel() { return db.shipmentPhoto; }

  async findByShipment(shipmentId: string) {
    return this.getModel().findMany({
      where: { shipmentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const shipmentPhotoRepository = new ShipmentPhotoRepository();
