import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, Clock, Moon, Pencil, Plus } from 'lucide-react';
import { db } from '../db';
import { useAppStore } from '../store';
import { SLOGAN } from '../constants';
import { dayStart, formatClock, formatDurationMin, formatFullDate, formatMonthDay, formatWeekday, isSameDay } from '../utils/time';
import ParticleButton from '../components/ParticleButton';
import BottomSheet from '../components/BottomSheet';
import TimeRangeModal from '../components/TimeRangeModal';
import CalendarPickerSheet from '../components/CalendarPickerSheet';
import TodayPlanPanel from '../components/TodayPlanPanel';
import { VALUE_SCORES } from '../constants';

export default function RecordPage() {
  const setArchiveDraft = useAppStore((s) => s.setArchiveDraft);
  const setSleepSheetOpen = useAppStore((s) => s.setSleepSheetOpen);
  const setEditRecordId = useAppStore((s) => s.setEditRecordId);
  const activeSession = useAppStore((s) => s.activeSession);
  const startTimer = useAppStore((s) => s.startTimer);
  const viewingDate = useAppStore((s) => s.viewingDate);
  const setViewingDate = useAppStore((s) => s.setViewingDate);

  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedFw, setExpandedFw] = useState<string | null>(null);
  const [editSessionOpen, setEditSessionOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // 跨日时自动把 viewingDate 重置到今天（避免一直停留在过去的某天）
  useEffect(() => {
    if (!isSameDay(viewingDate, Date.now())) {
      setViewingDate(dayStart(Date.now()));
    }
  }, [viewingDate, setViewingDate]);

  const today = useLiveQuery(() => {
    const s = dayStart(viewingDate);
    return db.records.where('startAt').between(s, s + 86400000, true, false).toArray();
  }, [viewingDate]);
  const frameworks = useLiveQuery(() => db.frameworks.orderBy('order').toArray(), []);
  const subcategories = useLiveQuery(() => db.subcategories.orderBy('order').toArray(), []);

  const todayRecords = (today ?? []).sort((a, b) => b.startAt - a.startAt);
  const totalMin = todayRecords.reduce((s, r) => s + r.durationMin, 0);
  const fwMap = new Map((frameworks ?? []).map((f) => [f.id, f]));
  const subMap = new Map((subcategories ?? []).map((s) => [s.id, s]));

  const fwMinutes = (fwId: string) =>
    todayRecords.filter((r) => r.frameworkId === fwId).reduce((s, r) => s + r.durationMin, 0);
  const subMinutes = (subId: string) =>
    todayRecords.filter((r) => r.subcategoryId === subId).reduce((s, r) => s + r.durationMin, 0);

  const openManual = (frameworkId?: string) => {
    const end = Date.now();
    const start = end - 30 * 60000;
    setArchiveDraft({
      startAt: start,
      endAt: end,
      durationMin: 30,
      source: 'manual',
      presetFrameworkId: frameworkId,
    });
    setMenuOpen(false);
  };

  const openSleep = () => {
    setMenuOpen(false);
    setSleepSheetOpen(true);
  };

  return (
    <div className="mx-auto max-w-md px-5 pb-32 pt-6">
      {/* 顶部 HUD */}
      <header className="flex items-start justify-between">
        <button
          onClick={() => setCalendarOpen(true)}
          className="-ml-2 flex items-start gap-2 rounded-xl px-2 py-1 text-left transition active:scale-[0.98]"
        >
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-binance/80">
              迹时 · {SLOGAN}
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-text-secondary">
              {new Date(viewingDate).getFullYear()} / {String(new Date(viewingDate).getMonth() + 1).padStart(2, '0')}
            </p>
            <p className="mt-1 text-lg font-semibold text-text">
              {isSameDay(viewingDate, Date.now())
                ? `今天 · ${formatMonthDay(viewingDate)} ${formatWeekday(viewingDate)}`
                : `${formatFullDate(viewingDate)} ${formatWeekday(viewingDate)}`}
            </p>
            <p className="mt-0.5 text-sm text-text-secondary">
              {isSameDay(viewingDate, Date.now())
                ? `今日已记录 ${formatDurationMin(totalMin)}`
                : `已记录 ${formatDurationMin(totalMin)}`}
            </p>
          </div>
          <CalendarDays size={18} className="mt-2 text-text-secondary" />
        </button>
        <button
          onClick={() => setMenuOpen(true)}
          className="flex items-center gap-1 rounded-full border border-binance/30 bg-binance/5 px-3 py-1.5 text-sm text-binance"
        >
          <Plus size={15} /> 补录
        </button>
      </header>

      {/* 今日计划表 */}
      <div className="mt-5">
        <TodayPlanPanel date={viewingDate} subcategories={subcategories ?? []} />
      </div>

      {/* 计时按钮 */}
      <div className="mt-8">
        <ParticleButton />
        {activeSession && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setEditSessionOpen(true)}
              className="flex items-center gap-1 text-sm text-text-secondary"
            >
              <Pencil size={14} /> 修改开始时间
            </button>
          </div>
        )}
      </div>

      {/* 四大框架卡片 */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-text-secondary">四大框架</h2>
        <div className="grid grid-cols-2 gap-3">
          {(frameworks ?? []).map((fw) => {
            const subs = (subcategories ?? [])
              .filter((s) => s.frameworkId === fw.id)
              .sort((a, b) => a.order - b.order);
            const expanded = expandedFw === fw.id;
            const isHealth = fw.id === 'health';
            return (
              <div
                key={fw.id}
                className="overflow-hidden rounded-2xl border border-binance/10 bg-bg-card/60 backdrop-blur"
                style={{ borderTopColor: fw.color, borderTopWidth: 2 }}
              >
                <button
                  onClick={() => setExpandedFw(expanded ? null : fw.id)}
                  className="w-full px-4 pb-3 pt-3 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-text">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: fw.color }} />
                      {fw.name}
                    </span>
                    <ChevronDown
                      size={15}
                      className={`text-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                  <p className="mt-2 text-xl font-semibold text-text">{formatDurationMin(fwMinutes(fw.id))}</p>
                </button>

                {expanded && (
                  <div className="space-y-1.5 px-4 pb-3">
                    {subs.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs text-text-secondary">
                        <span>{s.name}</span>
                        <span>{subMinutes(s.id) ? formatDurationMin(subMinutes(s.id)) : '—'}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => (isHealth ? openSleep() : openManual(fw.id))}
                  className="flex w-full items-center justify-center gap-1 border-t border-line py-2 text-xs text-text-secondary"
                >
                  <Plus size={13} /> 补录
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 时间线 */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-text-secondary">
          {isSameDay(viewingDate, Date.now()) ? '今日时间线' : `${formatMonthDay(viewingDate)} 时间线`}
        </h2>
        {todayRecords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-binance/20 py-10 text-center text-sm text-text-secondary">
            {isSameDay(viewingDate, Date.now()) ? '今天还没有记录，点上方「开始」记录第一段时间吧' : '这一天没有记录'}
          </div>
        ) : (
          <div className="space-y-2">
            {todayRecords.map((r) => {
              const fw = fwMap.get(r.frameworkId);
              const sub = subMap.get(r.subcategoryId);
              const vs = r.valueScore
                ? VALUE_SCORES.find((v) => v.id === r.valueScore)
                : null;
              return (
                <button
                  key={r.id}
                  onClick={() => r.id && setEditRecordId(r.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-binance/10 bg-bg-card/60 px-4 py-3 text-left backdrop-blur transition hover:border-binance/30"
                >
                  <span
                    className="h-10 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: fw?.color ?? '#848E9C' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text">
                      {formatClock(r.startAt)} - {formatClock(r.endAt)} · {formatDurationMin(r.durationMin)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-secondary">
                      {fw ? fw.name : '待归档'}{sub ? ` / ${sub.name}` : ''}
                    </p>
                    {/* 事件名称（#7） */}
                    <p
                      className={`mt-0.5 truncate text-xs ${
                        r.eventName ? 'text-binance' : 'italic text-text-secondary/50'
                      }`}
                    >
                      {r.eventName ? `✦ ${r.eventName}` : '未命名事件'}
                    </p>
                    {r.note && (
                      <p className="mt-0.5 truncate text-[11px] text-text-secondary/80">
                        心得：{r.note}
                      </p>
                    )}
                  </div>
                  {vs && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium text-black"
                      style={{ backgroundColor: vs.color }}
                    >
                      {vs.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 补录菜单 */}
      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="补录">
        <div className="space-y-3 pb-2">
          <button
            onClick={() => openManual()}
            className="flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left text-sm text-text"
          >
            <Clock size={18} className="text-binance" />
            补录时间（手动填写起止时间）
          </button>
          <button
            onClick={openSleep}
            className="flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left text-sm text-text"
          >
            <Moon size={18} className="text-fw-health" />
            补录睡眠（含午休模式）
          </button>
        </div>
      </BottomSheet>

      {/* 计时中修改开始时间 */}
      <TimeRangeModal
        open={editSessionOpen}
        title="修改开始时间"
        startOnly
        startAt={activeSession?.startAt ?? Date.now()}
        endAt={Date.now()}
        onClose={() => setEditSessionOpen(false)}
        onSave={(s) => {
          void startTimer(s);
          setEditSessionOpen(false);
        }}
      />

      {/* 日历选择器 */}
      <CalendarPickerSheet
        open={calendarOpen}
        value={viewingDate}
        onClose={() => setCalendarOpen(false)}
        onPick={(ts) => setViewingDate(ts)}
      />
    </div>
  );
}
