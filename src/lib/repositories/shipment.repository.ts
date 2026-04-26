import { BaseRepository, type PaginatedResult, type PaginationOptions } from './base.repository';
import { db } from '../db';
import type { Shipment, Prisma } from '@prisma/client';

export class ShipmentRepository extends BaseRepository<Shipment, Prisma.ShipmentCreateInput, Prisma.ShipmentUpdateInput> {
  protected getModel() { return db.shipment; }

  async findByTrackingNumber(trackingNumber: string): Promise<Shipment | null> {
    return this.getModel().findUnique({ where: { trackingNumber } });
  }

  async findByShipmentId(shipmentId: string): Promise<Shipment | null> {
    return this.getModel().findUnique({ where: { shipmentId } });
  }

  async findByCustomer(customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Shipment>> {
    return this.findPaginated({ ...options, where: { customerId } });
  }

  async findByStatus(status: string, options?: PaginationOptions): Promise<PaginatedResult<Shipment>> {
    return this.findPaginated({ ...options, where: { status: status as any } });
  }

  async findByWarehouse(warehouseId: string, options?: PaginationOptions): Promise<PaginatedResult<Shipment>> {
    return this.findPaginated({ ...options, where: { warehouseId } });
  }

  async updateStatus(id: string, status: string): Promise<Shipment> {
    return this.update(id, { status: status as any } as any);
  }

  async findWithDetails(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        warehouse: true,
        route: true,
        trackingEvents: { orderBy: { timestamp: 'desc' } },
        photos: { orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async countByStatus(): Promise<Record<string, number>> {
    const grouped = await this.getModel().groupBy({
      by: ['status'],
      _count: { status: true },
      where: { active: true },
    });
    return Object.fromEntries(grouped.map(g => [g.status, g._count.status]));
  }
}

export const shipmentRepository = new ShipmentRepository();
