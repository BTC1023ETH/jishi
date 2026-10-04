import { useEffect, useState } from 'react';
import { SLEEP_FRAMEWORK_ID, SLEEP_SUBCATEGORY_ID } from '../constants';
import { useAppStore } from '../store';
import { addRecord, recomputeDuration } from '../utils/records';
import { dateStrToTs, formatClock, formatFullDate, formatDurationMin } from '../utils/time';
import BottomSheet from './BottomSheet';

export default function SleepSheet() {
  const open = useAppStore((s) => s.sleepSheetOpen);
  const setOpen = useAppStore((s) => s.setSleepSheetOpen);
  const showToast = useAppStore((s) => s.showToast);

  const [date, setDate] = useState('');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setDate(formatFullDate(Date.now()));
      setSleepTime('23:00');
      setWakeTime('07:00');
      setNote('');
    }
  }, [open]);

  const quickNap = () => {
    const now = Date.now();
    const start = now - 30 * 60000;
    setDate(formatFullDate(now));
    setSleepTime(formatClock(start));
    setWakeTime(formatClock(now));
  };

  const previewDuration = () => {
    let s = dateStrToTs(date, sleepTime);
    let e = dateStrToTs(date, wakeTime);
    if (e <= s) e += 86400000;
    return recomputeDuration(s, e);
  };

  const save = async () => {
    let s = dateStrToTs(date, sleepTime);
    let e = dateStrToTs(date, wakeTime);
    if (e <= s) e += 86400000;
    await addRecord({
      startAt: s,
      endAt: e,
      durationMin: recomputeDuration(s, e),
      frameworkId: SLEEP_FRAMEWORK_ID,
      subcategoryId: SLEEP_SUBCATEGORY_ID,
      note,
      valueScore: 'nourish',
      source: 'sleep',
    });
    showToast('已记录睡眠');
    setOpen(false);
  };

  const inputCls =
    'w-full rounded-xl border border-line bg-bg-card2 px-3 py-2.5 text-white outline-none focus:border-binance';

  return (
    <BottomSheet open={open} onClose={() => setOpen(false)} title="补录睡眠">
      <div className="space-y-4 pb-2">
        <div className="flex items-center justify-between rounded-xl bg-bg-card2 px-4 py-3">
          <span className="text-sm text-text-secondary">预计时长</span>
          <span className="text-base font-semibold text-binance">{formatDurationMin(previewDuration())}</span>
        </div>

        <div>
          <p className="mb-1.5 text-xs text-text-secondary">日期</p>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 text-xs text-text-secondary">入睡时间</p>
            <input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} className={inputCls} />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-text-secondary">醒来时间</p>
            <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className={inputCls} />
          </div>
        </div>

        <button
          onClick={quickNap}
          className="w-full rounded-xl border border-line py-2.5 text-sm text-text-secondary"
        >
          午休 30 分钟（快速补录）
        </button>

        <div>
          <p className="mb-1.5 text-xs text-text-secondary">备注</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className={inputCls}
            placeholder="睡眠质量如何…（可选）"
          />
        </div>

        <button onClick={save} className="w-full rounded-xl bg-binance py-3 text-sm font-semibold text-black">
          保存（自动归为 身体与心理 → 睡眠 · 滋养）
        </button>
      </div>
    </BottomSheet>
  );
}
