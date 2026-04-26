import { BaseRepository, type PaginatedResult, type PaginationOptions } from './base.repository';
import { db } from '../db';
import type { EmailLog, Prisma } from '@prisma/client';

export class EmailLogRepository extends BaseRepository<EmailLog, Prisma.EmailLogCreateInput, Prisma.EmailLogUpdateInput> {
  protected getModel() { return db.emailLog; }

  async findByStatus(status: string, options?: PaginationOptions): Promise<PaginatedResult<EmailLog>> {
    return this.findPaginated({ ...options, where: { status } });
  }

  async findByRecipient(to: string, options?: PaginationOptions): Promise<PaginatedResult<EmailLog>> {
    return this.findPaginated({ ...options, where: { to } });
  }
}

export const emailLogRepository = new EmailLogRepository();
