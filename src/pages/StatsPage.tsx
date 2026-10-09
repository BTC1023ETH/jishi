import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { db } from '../db';
import EChart from '../components/EChart';
import HologramDonut from '../components/HologramDonut';
import { buildHeatmapOption } from '../utils/charts';
import { monthStart, weekStart } from '../utils/records';
import { dayStart, formatDurationMin, formatFullDate, isSameDay } from '../utils/time';
import { useAppStore } from '../store';
import CalendarPickerSheet from '../components/CalendarPickerSheet';
import ParticleSankey from '../components/ParticleSankey';

// 把 hex/rgb 颜色按系数提亮（>1 变亮，<1 变暗）。仅做简单 RGB 线性插值。
function shadeColor(input: string, factor: number): string {
  // 接受 #rrggbb / #rgb / rgb(...)
  let r = 0, g = 0, b = 0;
  const s = input.trim();
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    r = parseInt(full.slice(0, 2), 16);
    g = parseInt(full.slice(2, 4), 16);
    b = parseInt(full.slice(4, 6), 16);
  } else {
    const m = s.match(/(\d+)\D+(\d+)\D+(\d+)/);
    if (m) { r = +m[1]; g = +m[2]; b = +m[3]; }
  }
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  r = clamp(r * factor); g = clamp(g * factor); b = clamp(b * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

type Range = 'day' | 'week' | 'month';

const RANGES: { id: Range; label: string }[] = [
  { id: 'day', label: '今日' },
  { id: 'week', label: '本周' },
  { id: 'month', label: '本月' },
];

export default function StatsPage() {
  const [range, setRange] = useState<Range>('week');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const viewingDate = useAppStore((s) => s.viewingDate);

  const records = useLiveQuery(() => db.records.toArray(), []);
  const frameworks = useLiveQuery(() => db.frameworks.orderBy('order').toArray(), []);
  const subcategories = useLiveQuery(() => db.subcategories.orderBy('order').toArray(), []);

  const now = Date.now();

  const fwMap = useMemo(() => new Map((frameworks ?? []).map((f) => [f.id, f])), [frameworks]);
  const subMap = useMemo(() => new Map((subcategories ?? []).map((s) => [s.id, s])), [subcategories]);

  const rangeStart = range === 'day' ? dayStart(now) : range === 'week' ? weekStart(now) : monthStart(now);
  const inRange = (records ?? []).filter((r) => r.startAt >= rangeStart);

  const sum = (list: { durationMin: number }[]) => list.reduce((a, r) => a + r.durationMin, 0);

  const dayTotal = sum((records ?? []).filter((r) => r.startAt >= dayStart(now)));
  const weekTotal = sum((records ?? []).filter((r) => r.startAt >= weekStart(now)));
  const monthTotal = sum((records ?? []).filter((r) => r.startAt >= monthStart(now)));
  const monthNourish = sum((records ?? []).filter((r) => r.startAt >= monthStart(now) && r.valueScore === 'nourish'));
  const nourishRatio = monthTotal ? Math.round((monthNourish / monthTotal) * 100) : 0;

  // 河流图已删除（#9）
  const streamDays = 0;
  void streamDays;

  // 环形图
  const donutItems = (frameworks ?? []).map((fw) => ({
    name: fw.name,
    color: fw.color,
    value: sum(inRange.filter((r) => r.frameworkId === fw.id)),
  }));

  // 热力图（本年）
  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1).getTime();
  const todayStart = dayStart(now);
  const heatDays: { date: string; value: number }[] = [];
  for (let t = yearStart; t <= todayStart; t += 86400000) {
    const e = t + 86400000;
    heatDays.push({
      date: formatFullDate(t),
      value: (records ?? []).filter((r) => r.startAt >= t && r.startAt < e).reduce((a, r) => a + r.durationMin, 0),
    });
  }

  // 细分领域排行
  const topSubs = (subcategories ?? [])
    .map((s) => {
      const fw = fwMap.get(s.frameworkId);
      return {
        id: s.id,
        name: s.name,
        fwName: fw?.name ?? '',
        color: fw?.color ?? '#848E9C',
        value: sum(inRange.filter((r) => r.subcategoryId === s.id)),
      };
    })
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const donutOption = useMemo(() => donutItems, [range, records]);
  const heatmapOption = useMemo(() => buildHeatmapOption(heatDays, year), [records]);

  const maxTop = Math.max(1, ...topSubs.map((s) => s.value));

  const hasData = (records ?? []).length > 0;

  return (
    <div className="mx-auto max-w-md px-5 pb-32 pt-6">
      <header className="flex items-center justify-between">
        <button
          onClick={() => setCalendarOpen(true)}
          className="flex items-center gap-2 text-left"
        >
          <h1 className="text-lg font-semibold text-text">统计</h1>
          <span className="flex items-center gap-1 rounded-full border border-line bg-bg-card px-2.5 py-1 text-xs text-text-secondary">
            <CalendarDays size={13} />
            {isSameDay(viewingDate, Date.now()) ? '今天' : formatFullDate(viewingDate)}
          </span>
        </button>
        <div className="flex rounded-full border border-line bg-bg-card p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`rounded-full px-3 py-1 text-xs ${
                range === r.id ? 'bg-binance font-medium text-black' : 'text-text-secondary'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {/* 指标 */}
      <div className="mt-5 grid grid-cols-4 gap-2">
        {[
          { label: '今日', value: dayTotal },
          { label: '本周', value: weekTotal },
          { label: '本月', value: monthTotal },
          { label: '滋养占比', value: nourishRatio, suffix: '%' },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-line bg-bg-card px-2 py-3 text-center">
            <p className="text-xs text-text-secondary">{m.label}</p>
            <p className="mt-1 text-base font-semibold text-text">
              {m.suffix ? `${m.value}${m.suffix}` : formatDurationMin(m.value)}
            </p>
          </div>
        ))}
      </div>

      {!hasData ? (
        <div className="mt-16 rounded-2xl border border-dashed border-line py-16 text-center text-sm text-text-secondary">
          还没有数据，去「记录」页开始第一段计时吧
        </div>
      ) : (
        <>
          {/* 离子桑基图（粒子特效 #9） */}
          <section className="mt-6 rounded-2xl border border-line bg-bg-card p-4">
            <h3 className="mb-2 text-sm font-medium text-text">时间流向（你 → 框架 → 细分）</h3>
            <ParticleSankey
              records={inRange}
              frameworks={frameworks ?? []}
              subcategories={subcategories ?? []}
              height={300}
            />
          </section>

          {/* 环形图（全息流体·数据流） */}
          <section className="mt-4 rounded-2xl border border-line bg-bg-card p-4">
            <h3 className="mb-2 text-sm font-medium text-text">四大框架占比</h3>
            <HologramDonut items={donutItems} />
          </section>

          {/* 排行（流线型光带） */}
          <section className="mt-4 rounded-2xl border border-line bg-bg-card p-4">
            <h3 className="mb-3 text-sm font-medium text-text">细分领域时长排行</h3>
            <div className="space-y-3">
              {topSubs.map((s, i) => {
                const pct = (s.value / maxTop) * 100;
                // 暗 → 亮 渐变：根据 fw.color
                const grad = `linear-gradient(90deg, ${s.color}55 0%, ${s.color} 70%, ${shadeColor(s.color, 1.4)} 100%)`;
                return (
                  <div key={s.id}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-text">
                        <span className="mr-1.5 text-text-secondary">{i + 1}</span>
                        {s.name}
                        <span className="ml-1.5 text-text-secondary">{s.fwName}</span>
                      </span>
                      <span
                        className="font-mono text-text-secondary"
                        style={{ textShadow: `0 0 6px ${s.color}66` }}
                      >
                        {formatDurationMin(s.value)}
                      </span>
                    </div>
                    <div
                      className="relative h-2 w-full overflow-hidden rounded-full"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      {/* 极暗底色发光层 */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: `${pct}%`,
                          background: grad,
                          borderRadius: 999,
                          boxShadow: `0 0 8px ${s.color}55, inset 0 0 6px rgba(255,255,255,0.18)`,
                          transition: 'width 700ms cubic-bezier(.3,1.2,.5,1)',
                        }}
                      />
                      {/* 前端光斑（呼吸脉冲） */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: `calc(${pct}% - 6px)`,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          background: `radial-gradient(circle, ${shadeColor(s.color, 1.8)} 0%, ${s.color}00 70%)`,
                          transform: 'translateY(-50%)',
                          animation: 'rankPulse 2.4s ease-in-out infinite',
                          pointerEvents: 'none',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {topSubs.length === 0 && <p className="text-sm text-text-secondary">暂无排行数据</p>}
            </div>
            <style>{`
              @keyframes rankPulse {
                0%, 100% { opacity: 0.55; transform: translateY(-50%) scale(0.85); }
                50%      { opacity: 1;    transform: translateY(-50%) scale(1.15); }
              }
            `}</style>
          </section>

          {/* 热力图 */}
          <section className="mt-4 rounded-2xl border border-line bg-bg-card p-4">
            <h3 className="mb-2 text-sm font-medium text-text">记录密度</h3>
            <EChart option={heatmapOption} height={180} />
          </section>
        </>
      )}

      <CalendarPickerSheet
        open={calendarOpen}
        value={viewingDate}
        onClose={() => setCalendarOpen(false)}
        onPick={() => {
          /* viewingDate 在 store 已更新；统计本身按今日/本周/本月统计，日期更多用于定位 */
        }}
        title="选择日期"
      />
    </div>
  );
}
