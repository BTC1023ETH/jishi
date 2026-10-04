import Dexie, { type Table } from 'dexie';
import type { ActiveSession, Framework, Settings, Subcategory, TimeRecord, UserProfile } from './types';
import { DEFAULT_FRAMEWORKS, DEFAULT_SETTINGS, DEFAULT_SUBCATEGORIES } from './constants';

interface MetaValue {
  key: string;
  value: unknown;
}

class JishiDB extends Dexie {
  records!: Table<TimeRecord, string>;
  frameworks!: Table<Framework, string>;
  subcategories!: Table<Subcategory, string>;
  meta!: Table<MetaValue, string>;

  constructor() {
    super('jishi');
    this.version(1).stores({
      records: 'id, startAt, endAt, frameworkId, subcategoryId, updatedAt',
      frameworks: 'id, order',
      subcategories: 'id, frameworkId, order',
      meta: 'key',
    });
  }
}

export const db = new JishiDB();

/** 首次运行时写入默认框架、细分领域与设置 */
export async function initDB() {
  const fwCount = await db.frameworks.count();
  if (fwCount === 0) {
    await db.transaction('rw', db.frameworks, db.subcategories, db.meta, async () => {
      await db.frameworks.bulkAdd(DEFAULT_FRAMEWORKS);
      await db.subcategories.bulkAdd(DEFAULT_SUBCATEGORIES);
      await db.meta.put({ key: 'settings', value: DEFAULT_SETTINGS });
    });
  }
}

export async function getMeta<T>(key: string): Promise<T | null> {
  const item = await db.meta.get(key);
  return (item?.value as T) ?? null;
}

export async function setMeta<T>(key: string, value: T): Promise<void> {
  await db.meta.put({ key, value });
}

export async function deleteMeta(key: string): Promise<void> {
  await db.meta.delete(key);
}
