import { BaseRepository, type PaginatedResult, type PaginationOptions } from './base.repository';
import { db } from '../db';
import type { AuditLog, Prisma } from '@prisma/client';

export class AuditLogRepository extends BaseRepository<AuditLog, Prisma.AuditLogCreateInput, Prisma.AuditLogUpdateInput> {
  protected getModel() { return db.auditLog; }

  async findByUser(userId: string, options?: PaginationOptions): Promise<PaginatedResult<AuditLog>> {
    return this.findPaginated({ ...options, where: { userId } });
  }

  async findByEntity(entity: string, entityId?: string, options?: PaginationOptions): Promise<PaginatedResult<AuditLog>> {
    return this.findPaginated({ ...options, where: { entity, ...(entityId && { entityId }) } });
  }

  async findByAction(action: string, options?: PaginationOptions): Promise<PaginatedResult<AuditLog>> {
    return this.findPaginated({ ...options, where: { action } });
  }
}

export const auditLogRepository = new AuditLogRepository();
