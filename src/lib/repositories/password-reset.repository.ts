import { BaseRepository } from './base.repository';
import { db } from '../db';
import type { PasswordReset, Prisma } from '@prisma/client';

export class PasswordResetRepository extends BaseRepository<PasswordReset, Prisma.PasswordResetCreateInput, Prisma.PasswordResetUpdateInput> {
  protected getModel() { return db.passwordReset; }

  async findByToken(token: string): Promise<PasswordReset | null> {
    return this.getModel().findUnique({ where: { token } });
  }

  async findValidByToken(token: string): Promise<PasswordReset | null> {
    const reset = await this.findByToken(token);
    if (!reset || reset.used || reset.expiresAt < new Date()) return null;
    return reset;
  }

  async markAsUsed(id: string): Promise<PasswordReset> {
    return this.update(id, { used: true } as any);
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.getModel().deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}

export const passwordResetRepository = new PasswordResetRepository();
