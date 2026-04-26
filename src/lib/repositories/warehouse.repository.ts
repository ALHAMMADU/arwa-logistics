import { BaseRepository, type PaginatedResult, type PaginationOptions } from './base.repository';
import { db } from '../db';
import type { Warehouse, Prisma } from '@prisma/client';

export class WarehouseRepository extends BaseRepository<Warehouse, Prisma.WarehouseCreateInput, Prisma.WarehouseUpdateInput> {
  protected getModel() { return db.warehouse; }

  async findActive(options?: PaginationOptions): Promise<PaginatedResult<Warehouse>> {
    return this.findPaginated({ ...options, where: { active: true } });
  }

  async findWithManager(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: { manager: { select: { id: true, name: true, email: true } } },
    });
  }

  async findWithShipmentCount(id: string) {
    const warehouse = await this.getModel().findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { shipments: true } },
      },
    });
    return warehouse;
  }
}

export const warehouseRepository = new WarehouseRepository();
