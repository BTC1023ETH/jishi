import Dexie, { type Table } from 'dexie';
import type {
  ActiveSession,
  Framework,
  PlanItem,
  Settings,
  Subcategory,
  TimeRecord,
  UserProfile,
} from './types';
import { DEFAULT_FRAMEWORKS, DEFAULT_SETTINGS, DEFAULT_SUBCATEGORIES } from './constants';

interface MetaValue {
  key: string;
  value: unknown;
}

class JishiDB extends Dexie {
  records!: Table<TimeRecord, string>;
  frameworks!: Table<Framework, string>;
  subcategories!: Table<Subcategory, string>;
  plans!: Table<PlanItem, string>;
  meta!: Table<MetaValue, string>;

  constructor() {
    super('jishi');
    // v1: 原 schema
    this.version(1).stores({
      records: 'id, startAt, endAt, frameworkId, subcategoryId, updatedAt',
      frameworks: 'id, order',
      subcategories: 'id, frameworkId, order',
      meta: 'key',
    });
    // v2: 新增 plans 表（TimeRecord.eventName 通过版本升级自动可用，字段不需索引）
    this.version(2).stores({
      records: 'id, startAt, endAt, frameworkId, subcategoryId, updatedAt',
      frameworks: 'id, order',
      subcategories: 'id, frameworkId, order',
      plans: 'id, date, updatedAt',
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

/** 工具：创建/取一个时间记录 ID */
export function newRecordId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function newPlanId(): string {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
