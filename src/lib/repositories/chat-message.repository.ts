import { BaseRepository, type PaginationOptions, type PaginatedResult } from './base.repository';
import { db } from '../db';
import type { ChatMessage, Prisma } from '@prisma/client';

export class ChatMessageRepository extends BaseRepository<ChatMessage, Prisma.ChatMessageCreateInput, Prisma.ChatMessageUpdateInput> {
  protected getModel() { return db.chatMessage; }

  async findByUser(userId: string, options?: PaginationOptions): Promise<PaginatedResult<ChatMessage>> {
    return this.findPaginated({ ...options, where: { userId }, sortBy: 'createdAt', sortOrder: 'asc' });
  }

  async findRecentByUser(userId: string, limit = 50) {
    return this.getModel().findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const chatMessageRepository = new ChatMessageRepository();
