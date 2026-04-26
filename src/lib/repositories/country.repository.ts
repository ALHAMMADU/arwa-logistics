import { BaseRepository } from './base.repository';
import { db } from '../db';
import type { Country, Prisma } from '@prisma/client';

export class CountryRepository extends BaseRepository<Country, Prisma.CountryCreateInput, Prisma.CountryUpdateInput> {
  protected getModel() { return db.country; }

  async findByCode(code: string): Promise<Country | null> {
    return this.getModel().findUnique({ where: { code } });
  }

  async findActive() {
    return this.getModel().findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }
}

export const countryRepository = new CountryRepository();
