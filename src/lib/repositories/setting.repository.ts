import { BaseRepository } from './base.repository';
import { db } from '../db';
import type { Setting, Prisma } from '@prisma/client';

export class SettingRepository extends BaseRepository<Setting, Prisma.SettingCreateInput, Prisma.SettingUpdateInput> {
  protected getModel() { return db.setting; }

  async findByKey(key: string): Promise<Setting | null> {
    return this.getModel().findUnique({ where: { key } });
  }

  async upsertSetting(key: string, value: string): Promise<Setting> {
    return this.getModel().upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async getTypedValue<T>(key: string): Promise<T | null> {
    const setting = await this.findByKey(key);
    if (!setting) return null;
    try {
      return JSON.parse(setting.value) as T;
    } catch {
      return setting.value as unknown as T;
    }
  }
}

export const settingRepository = new SettingRepository();
