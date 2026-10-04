export function pad2(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

export function formatClock(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatFullDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function formatMonthDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatWeekday(ts: number): string {
  const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weeks[new Date(ts).getDay()];
}

/** 秒 → MM:SS（计时显示，不显示小时上限） */
export function formatHM(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  return `${pad2(m)}:${pad2(s)}`;
}

/** 分钟 → 人性化文案 */
export function formatDurationMin(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} 小时 ${rest} 分钟` : `${h} 小时`;
}

export function timeStrToMin(str: string): number {
  const [h, m] = str.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minToTimeStr(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

export function dateStrToTs(dateStr: string, timeStr: string): number {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0).getTime();
}

/** 某天 00:00 的时间戳 */
export function dayStart(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function addDays(ts: number, days: number): number {
  return ts + days * 86400000;
}

/** 判断 ts 是否落在睡眠时段内（跨夜） */
export function isInSleepWindow(ts: number, sleepStart: string, sleepEnd: string): boolean {
  const nowMin = new Date(ts).getHours() * 60 + new Date(ts).getMinutes();
  const start = timeStrToMin(sleepStart);
  const end = timeStrToMin(sleepEnd);
  if (start === end) return false;
  if (start < end) return nowMin >= start && nowMin < end;
  // 跨夜：例如 23:00 — 07:00
  return nowMin >= start || nowMin < end;
}
