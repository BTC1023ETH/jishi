import * as XLSX from 'xlsx';
import { db } from '../db';
import type { Framework, Subcategory, TimeRecord } from '../types';
import { formatClock, formatFullDate } from './time';

function valueName(v: TimeRecord['valueScore']): string {
  if (v === 'nourish') return '滋养';
  if (v === 'neutral') return '中性';
  if (v === 'drain') return '消耗';
  return '';
}

interface ExportCtx {
  records: TimeRecord[];
  fwMap: Map<string, Framework>;
  subMap: Map<string, Subcategory>;
}

export async function getExportCtx(): Promise<ExportCtx> {
  const [records, frameworks, subcategories] = await Promise.all([
    db.records.toArray(),
    db.frameworks.toArray(),
    db.subcategories.toArray(),
  ]);
  records.sort((a, b) => a.startAt - b.startAt);
  return {
    records,
    fwMap: new Map(frameworks.map((f) => [f.id, f])),
    subMap: new Map(subcategories.map((s) => [s.id, s])),
  };
}

export const CSV_HEADERS = ['日期', '开始时间', '结束时间', '时长(分钟)', '大框架', '细分领域', '价值评分', '备注'];

function recordsToRows(ctx: ExportCtx) {
  return ctx.records.map((r) => ({
    日期: formatFullDate(r.startAt),
    开始时间: formatClock(r.startAt),
    结束时间: formatClock(r.endAt),
    '时长(分钟)': r.durationMin,
    大框架: ctx.fwMap.get(r.frameworkId)?.name ?? '',
    细分领域: ctx.subMap.get(r.subcategoryId)?.name ?? '',
    价值评分: valueName(r.valueScore),
    备注: r.note ?? '',
  }));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportCSV() {
  const ctx = await getExportCtx();
  const ws = XLSX.utils.json_to_sheet(recordsToRows(ctx), { header: CSV_HEADERS });
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadBlob(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), '迹时-记录.csv');
}

export async function exportJSON() {
  const [records, frameworks, subcategories, settings] = await Promise.all([
    db.records.toArray(),
    db.frameworks.toArray(),
    db.subcategories.toArray(),
    db.meta.get('settings'),
  ]);
  const data = {
    app: '迹时',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: settings?.value ?? null,
    frameworks,
    subcategories,
    records,
  };
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    `迹时-备份-${formatFullDate(Date.now())}.json`,
  );
}

export async function exportExcel() {
  const ctx = await getExportCtx();
  const wb = XLSX.utils.book_new();

  const allRows = recordsToRows(ctx);
  const wsAll = XLSX.utils.json_to_sheet(allRows, { header: CSV_HEADERS });
  XLSX.utils.book_append_sheet(wb, wsAll, '全部记录');

  // 按框架汇总
  const fwAgg = new Map<string, { name: string; color: string; minutes: number; count: number }>();
  for (const r of ctx.records) {
    const fw = ctx.fwMap.get(r.frameworkId);
    const name = fw?.name ?? '未归档';
    const key = name;
    if (!fwAgg.has(key)) fwAgg.set(key, { name, color: fw?.color ?? '#848E9C', minutes: 0, count: 0 });
    const item = fwAgg.get(key)!;
    item.minutes += r.durationMin;
    item.count += 1;
  }
  const fwRows = [...fwAgg.values()].map((f) => ({
    大框架: f.name,
    '时长(分钟)': f.minutes,
    记录数: f.count,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fwRows), '按框架汇总');

  // 按周汇总
  const weekAgg = new Map<string, { week: string; minutes: number; byFw: Map<string, number> }>();
  for (const r of ctx.records) {
    const d = new Date(r.startAt);
    const day = (d.getDay() + 6) % 7;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
    const weekKey = formatFullDate(monday.getTime());
    if (!weekAgg.has(weekKey)) weekAgg.set(weekKey, { week: weekKey, minutes: 0, byFw: new Map() });
    const w = weekAgg.get(weekKey)!;
    w.minutes += r.durationMin;
    const fwName = ctx.fwMap.get(r.frameworkId)?.name ?? '未归档';
    w.byFw.set(fwName, (w.byFw.get(fwName) ?? 0) + r.durationMin);
  }
  const weekRows = [...weekAgg.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((w) => {
      const row: Record<string, string | number> = { 周起始: w.week, '总时长(分钟)': w.minutes };
      for (const [k, v] of w.byFw) row[k] = v;
      return row;
    });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(weekRows), '按周汇总');

  XLSX.writeFile(wb, `迹时-数据-${formatFullDate(Date.now())}.xlsx`);
}

export interface BackupData {
  app?: string;
  settings?: unknown;
  frameworks?: Framework[];
  subcategories?: Subcategory[];
  records?: TimeRecord[];
}

export async function importJSON(file: File): Promise<{ records: number; frameworks: number }> {
  const text = await file.text();
  const data: BackupData = JSON.parse(text);

  let records = 0;
  let frameworks = 0;

  await db.transaction('rw', db.records, db.frameworks, db.subcategories, db.meta, async () => {
    if (Array.isArray(data.frameworks) && data.frameworks.length) {
      await db.frameworks.clear();
      await db.frameworks.bulkPut(data.frameworks);
      frameworks = data.frameworks.length;
    }
    if (Array.isArray(data.subcategories) && data.subcategories.length) {
      await db.subcategories.clear();
      await db.subcategories.bulkPut(data.subcategories);
    }
    if (Array.isArray(data.records)) {
      for (const r of data.records) {
        if (!r.id) r.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        r.createdAt = r.createdAt ?? Date.now();
        r.updatedAt = r.updatedAt ?? Date.now();
        await db.records.put(r);
        records += 1;
      }
    }
    if (data.settings) {
      await db.meta.put({ key: 'settings', value: data.settings });
    }
  });

  return { records, frameworks };
}
