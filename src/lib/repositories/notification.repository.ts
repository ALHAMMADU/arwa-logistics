import { BaseRepository } from './base.repository';
import { db } from '../db';
import type { Notification, Prisma } from '@prisma/client';

export class NotificationRepository extends BaseRepository<Notification, Prisma.NotificationCreateInput, Prisma.NotificationUpdateInput> {
  protected getModel() { return db.notification; }

  async findByUser(userId: string, unreadOnly = false) {
    return this.getModel().findMany({
      where: { userId, ...(unreadOnly && { read: false }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string): Promise<Notification> {
    return this.update(id, { read: true } as any);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.getModel().updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return result.count;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.count({ userId, read: false });
  }
}

export const notificationRepository = new NotificationRepository();
