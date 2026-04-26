import { BaseRepository, type PaginatedResult, type PaginationOptions } from './base.repository';
import { db } from '../db';
import type { User, Prisma } from '@prisma/client';

export class UserRepository extends BaseRepository<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
  protected getModel() { return db.user; }

  async findByEmail(email: string): Promise<User | null> {
    return this.getModel().findUnique({ where: { email } });
  }

  async findByRole(role: string, options?: PaginationOptions): Promise<PaginatedResult<User>> {
    return this.findPaginated({ ...options, where: { role: role as any } });
  }

  async findActiveUsers(options?: PaginationOptions): Promise<PaginatedResult<User>> {
    return this.findPaginated({ ...options, where: { active: true } });
  }

  async deactivateUser(id: string): Promise<User> {
    return this.update(id, { active: false } as any);
  }

  async activateUser(id: string): Promise<User> {
    return this.update(id, { active: true } as any);
  }

  async findWithDetails(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        shipments: { take: 10, orderBy: { createdAt: 'desc' } },
        payments: { take: 10, orderBy: { createdAt: 'desc' } },
        notifications: { where: { read: false }, take: 10 },
        warehouseManaged: true,
      },
    });
  }
}

export const userRepository = new UserRepository();
