import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db } from '../db';
import EChart from '../components/EChart';
import { buildDonutOption, buildHeatmapOption, buildSankeyOption, buildStreamOption } from '../utils/charts';
import { monthStart, weekStart } from '../utils/records';
import { dayStart, formatDurationMin, formatFullDate } from '../utils/time';

type Range = 'day' | 'week' | 'month';

const RANGES: { id: Range; label: string }[] = [
  { id: 'day', label: '今日' },
  { id: 'week', label: '本周' },
  { id: 'month', label: '本月' },
];

export default function StatsPage() {
  const [range, setRange] = useState<Range>('week');

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

  // 河流图窗口
  const streamDays = range === 'day' ? 7 : range === 'week' ? 14 : 30;
  const streamStart = dayStart(now) - (streamDays - 1) * 86400000;
  const streamDates = Array.from({ length: streamDays }, (_, i) => {
    const d = new Date(streamStart + i * 86400000);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const streamSeries = (frameworks ?? []).map((fw) => ({
    name: fw.name,
    color: fw.color,
    data: Array.from({ length: streamDays }, (_, i) => {
      const s = streamStart + i * 86400000;
      const e = s + 86400000;
      return (records ?? [])
        .filter((r) => r.frameworkId === fw.id && r.startAt >= s && r.startAt < e)
        .reduce((a, r) => a + r.durationMin, 0);
    }),
  }));

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

  const sankeyOption = useMemo(
    () => buildSankeyOption(inRange, frameworks ?? [], subcategories ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range, records],
  );
  const donutOption = useMemo(() => buildDonutOption(donutItems), [range, records]);
  const streamOption = useMemo(() => buildStreamOption(streamDates, streamSeries), [range, records]);
  const heatmapOption = useMemo(() => buildHeatmapOption(heatDays, year), [records]);

  const maxTop = Math.max(1, ...topSubs.map((s) => s.value));

  const hasData = (records ?? []).length > 0;

  return (
    <div className="mx-auto max-w-md px-5 pb-32 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">统计</h1>
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
          {/* 桑基图 */}
          <section className="mt-6 rounded-2xl border border-line bg-bg-card p-4">
            <h3 className="mb-2 text-sm font-medium text-text">时间流向（你 → 框架 → 细分）</h3>
            <EChart option={sankeyOption} height={280} />
          </section>

          {/* 河流图 */}
          <section className="mt-4 rounded-2xl border border-line bg-bg-card p-4">
            <h3 className="mb-2 text-sm font-medium text-text">时间河流</h3>
            <EChart option={streamOption} height={220} />
          </section>

          {/* 环形图 */}
          <section className="mt-4 rounded-2xl border border-line bg-bg-card p-4">
            <h3 className="mb-2 text-sm font-medium text-text">四大框架占比</h3>
            <EChart option={donutOption} height={240} />
          </section>

          {/* 排行 */}
          <section className="mt-4 rounded-2xl border border-line bg-bg-card p-4">
            <h3 className="mb-3 text-sm font-medium text-text">细分领域时长排行</h3>
            <div className="space-y-3">
              {topSubs.map((s, i) => (
                <div key={s.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-text">
                      <span className="mr-1.5 text-text-secondary">{i + 1}</span>
                      {s.name}
                      <span className="ml-1.5 text-text-secondary">{s.fwName}</span>
                    </span>
                    <span className="text-text-secondary">{formatDurationMin(s.value)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-card2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(s.value / maxTop) * 100}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              ))}
              {topSubs.length === 0 && <p className="text-sm text-text-secondary">暂无排行数据</p>}
            </div>
          </section>

          {/* 热力图 */}
          <section className="mt-4 rounded-2xl border border-line bg-bg-card p-4">
            <h3 className="mb-2 text-sm font-medium text-text">记录密度</h3>
            <EChart option={heatmapOption} height={180} />
          </section>
        </>
      )}
    </div>
  );
}
