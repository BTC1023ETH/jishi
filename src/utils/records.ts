import { db } from '../db';
import type { TimeRecord } from '../types';

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function recomputeDuration(startAt: number, endAt: number): number {
  return Math.max(1, Math.round((endAt - startAt) / 60000));
}

export async function addRecord(
  input: Omit<TimeRecord, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<TimeRecord> {
  const now = Date.now();
  const rec: TimeRecord = { ...input, id: newId(), createdAt: now, updatedAt: now };
  await db.records.add(rec);
  return rec;
}

export async function updateRecord(id: string, patch: Partial<TimeRecord>): Promise<void> {
  const existing = await db.records.get(id);
  if (!existing) return;
  await db.records.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteRecord(id: string): Promise<void> {
  await db.records.delete(id);
}

export async function recordsInRange(start: number, end: number): Promise<TimeRecord[]> {
  return db.records.where('startAt').between(start, end, true, false).toArray();
}

/** 本周一 00:00 */
export function weekStart(ts: number): number {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7; // 周一=0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
}

/** 本月 1 号 00:00 */
export function monthStart(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
