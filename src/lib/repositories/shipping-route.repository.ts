import { BaseRepository } from './base.repository';
import { db } from '../db';
import type { ShippingRoute, Prisma } from '@prisma/client';

export class ShippingRouteRepository extends BaseRepository<ShippingRoute, Prisma.ShippingRouteCreateInput, Prisma.ShippingRouteUpdateInput> {
  protected getModel() { return db.shippingRoute; }

  async findActive() {
    return this.getModel().findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }

  async findByOriginDestination(origin: string, destination: string) {
    return this.getModel().findMany({
      where: { originCountry: origin, destinationCountry: destination, active: true },
    });
  }
}

export const shippingRouteRepository = new ShippingRouteRepository();
