import { db } from '../db';
import { Prisma } from '@prisma/client';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FindOptions {
  where?: Record<string, unknown>;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown> | Array<Record<string, unknown>>;
  skip?: number;
  take?: number;
}

/**
 * Base repository providing common CRUD operations
 * All model-specific repositories extend this class
 */
export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected abstract getModel(): any; // Returns the Prisma delegate

  async findById(id: string, include?: Record<string, unknown>): Promise<T | null> {
    return this.getModel().findUnique({ where: { id }, include });
  }

  async findOne(where: Record<string, unknown>, include?: Record<string, unknown>): Promise<T | null> {
    return this.getModel().findUnique({ where, include });
  }

  async findMany(options: FindOptions = {}): Promise<T[]> {
    const { where, include, select, orderBy, skip, take } = options;
    return this.getModel().findMany({
      ...(where && { where }),
      ...(include && { include }),
      ...(select && { select }),
      ...(orderBy && { orderBy }),
      ...(skip !== undefined && { skip }),
      ...(take !== undefined && { take }),
    });
  }

  async findPaginated(options: PaginationOptions & FindOptions = {}): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', where, include, select } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.getModel().findMany({
        ...(where && { where }),
        ...(include && { include }),
        ...(select && { select }),
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.getModel().count({ ...(where && { where }) }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async create(data: CreateInput): Promise<T> {
    return this.getModel().create({ data });
  }

  async update(id: string, data: UpdateInput): Promise<T> {
    return this.getModel().update({ where: { id }, data });
  }

  async updateWhere(where: Record<string, unknown>, data: UpdateInput): Promise<T> {
    return this.getModel().update({ where, data });
  }

  async delete(id: string): Promise<T> {
    return this.getModel().delete({ where: { id } });
  }

  async deleteWhere(where: Record<string, unknown>): Promise<T> {
    return this.getModel().delete({ where });
  }

  async deleteMany(where: Record<string, unknown>): Promise<number> {
    const result = await this.getModel().deleteMany({ where });
    return result.count;
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.getModel().count({ ...(where && { where }) });
  }

  async exists(where: Record<string, unknown>): Promise<boolean> {
    const count = await this.getModel().count({ where });
    return count > 0;
  }

  async transaction<R>(fn: (tx: Prisma.TransactionClient) => Promise<R>): Promise<R> {
    return db.$transaction(fn);
  }
}
