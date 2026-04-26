import { BaseRepository, type PaginatedResult, type PaginationOptions } from './base.repository';
import { db } from '../db';
import type { Payment, Prisma } from '@prisma/client';

export class PaymentRepository extends BaseRepository<Payment, Prisma.PaymentCreateInput, Prisma.PaymentUpdateInput> {
  protected getModel() { return db.payment; }

  async findByPaymentId(paymentId: string): Promise<Payment | null> {
    return this.getModel().findUnique({ where: { paymentId } });
  }

  async findByShipment(shipmentId: string, options?: PaginationOptions): Promise<PaginatedResult<Payment>> {
    return this.findPaginated({ ...options, where: { shipmentId } });
  }

  async findByUser(userId: string, options?: PaginationOptions): Promise<PaginatedResult<Payment>> {
    return this.findPaginated({ ...options, where: { userId } });
  }

  async findByStatus(status: string, options?: PaginationOptions): Promise<PaginatedResult<Payment>> {
    return this.findPaginated({ ...options, where: { status } });
  }

  async getTotalRevenue(): Promise<number> {
    const result = await this.getModel().aggregate({
      _sum: { amount: true },
      where: { status: 'COMPLETED' },
    });
    return result._sum.amount || 0;
  }
}

export const paymentRepository = new PaymentRepository();
