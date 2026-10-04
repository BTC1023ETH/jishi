import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { ChevronDown, Clock, Moon, Pencil, Plus } from 'lucide-react';
import { db } from '../db';
import { useAppStore } from '../store';
import { dayStart, formatClock, formatDurationMin, formatMonthDay, formatWeekday } from '../utils/time';
import ParticleButton from '../components/ParticleButton';
import BottomSheet from '../components/BottomSheet';
import TimeRangeModal from '../components/TimeRangeModal';

export default function RecordPage() {
  const setArchiveDraft = useAppStore((s) => s.setArchiveDraft);
  const setSleepSheetOpen = useAppStore((s) => s.setSleepSheetOpen);
  const setEditRecordId = useAppStore((s) => s.setEditRecordId);
  const activeSession = useAppStore((s) => s.activeSession);
  const startTimer = useAppStore((s) => s.startTimer);

  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedFw, setExpandedFw] = useState<string | null>(null);
  const [editSessionOpen, setEditSessionOpen] = useState(false);

  const today = useLiveQuery(() => {
    const s = dayStart(Date.now());
    return db.records.where('startAt').between(s, s + 86400000, true, false).toArray();
  }, []);
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
      {/* 顶部 */}
      <header className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold text-text">
            {formatMonthDay(Date.now())} {formatWeekday(Date.now())}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            今日已记录 <span className="font-medium text-binance">{formatDurationMin(totalMin)}</span>
          </p>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm text-text-secondary"
        >
          <Plus size={15} /> 补录
        </button>
      </header>

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
                className="overflow-hidden rounded-2xl border border-line bg-bg-card"
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

      {/* 今日时间线 */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-text-secondary">今日时间线</h2>
        {todayRecords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-text-secondary">
            今天还没有记录，点上方「开始」记录第一段时间吧
          </div>
        ) : (
          <div className="space-y-2">
            {todayRecords.map((r) => {
              const fw = fwMap.get(r.frameworkId);
              const sub = subMap.get(r.subcategoryId);
              return (
                <button
                  key={r.id}
                  onClick={() => r.id && setEditRecordId(r.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-bg-card px-4 py-3 text-left"
                >
                  <span
                    className="h-9 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: fw?.color ?? '#848E9C' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text">
                      {formatClock(r.startAt)} - {formatClock(r.endAt)} · {formatDurationMin(r.durationMin)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-secondary">
                      {fw ? `${fw.name}${sub ? ' / ' + sub.name : ''}` : '待归档'}
                    </p>
                  </div>
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
        startAt={activeSession?.startAt ?? Date.now()}
        endAt={Date.now()}
        onClose={() => setEditSessionOpen(false)}
        onSave={(s) => {
          void startTimer(s);
          setEditSessionOpen(false);
        }}
      />
    </div>
  );
}
