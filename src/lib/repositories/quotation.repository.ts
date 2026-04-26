import { BaseRepository, type PaginatedResult, type PaginationOptions } from './base.repository';
import { db } from '../db';
import type { Quotation, Prisma } from '@prisma/client';

export class QuotationRepository extends BaseRepository<Quotation, Prisma.QuotationCreateInput, Prisma.QuotationUpdateInput> {
  protected getModel() { return db.quotation; }

  async findByQuotationId(quotationId: string): Promise<Quotation | null> {
    return this.getModel().findUnique({ where: { quotationId } });
  }

  async findByCustomer(customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Quotation>> {
    return this.findPaginated({ ...options, where: { customerId } });
  }

  async findByStatus(status: string, options?: PaginationOptions): Promise<PaginatedResult<Quotation>> {
    return this.findPaginated({ ...options, where: { status: status as any } });
  }

  async findWithDetails(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }
}

export const quotationRepository = new QuotationRepository();
