import { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { dateStrToTs, formatFullDate, pad2 } from '../utils/time';

interface Props {
  open: boolean;
  startAt: number;
  endAt: number;
  onClose: () => void;
  onSave: (startAt: number, endAt: number) => void;
  /** 顶部标题，根据上下文切换（"修改开始时间" / "修改时间"） */
  title?: string;
  /** "用于计时中"模式：只让选开始时间 + 快速按钮（结束=现在） */
  startOnly?: boolean;
}

function tsToTimeStr(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function tsToDateStr(ts: number): string {
  return formatFullDate(ts);
}

export default function TimeRangeModal({
  open,
  startAt,
  endAt,
  onClose,
  onSave,
  title,
  startOnly = false,
}: Props) {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (open) {
      setStartDate(tsToDateStr(startAt));
      setStartTime(tsToTimeStr(startAt));
      setEndDate(tsToDateStr(endAt));
      setEndTime(tsToTimeStr(endAt));
    }
  }, [open, startAt, endAt]);

  const durationMin = useMemo(() => {
    const s = dateStrToTs(startDate, startTime);
    let e = dateStrToTs(endDate, endTime);
    if (e < s) return 0;
    return Math.round((e - s) / 60000);
  }, [startDate, startTime, endDate, endTime]);

  const shift = (deltaMin: number) => {
    const s = dateStrToTs(startDate, startTime) + deltaMin * 60000;
    setStartDate(tsToDateStr(s));
    setStartTime(tsToTimeStr(s));
    if (!startOnly) {
      const e = dateStrToTs(endDate, endTime) + deltaMin * 60000;
      setEndDate(tsToDateStr(e));
      setEndTime(tsToTimeStr(e));
    }
  };

  const setQuickDuration = (min: number) => {
    const s = dateStrToTs(startDate, startTime);
    const e = s + min * 60000;
    setEndDate(tsToDateStr(e));
    setEndTime(tsToTimeStr(e));
  };

  const valid = useMemo(() => {
    if (!startDate || !startTime) return false;
    if (startOnly) return true;
    if (!endDate || !endTime) return false;
    const s = dateStrToTs(startDate, startTime);
    const e = dateStrToTs(endDate, endTime);
    return e > s && (e - s) / 60000 <= 24 * 60;
  }, [startDate, startTime, endDate, endTime, startOnly]);

  const save = () => {
    if (!valid) return;
    let s = dateStrToTs(startDate, startTime);
    if (startOnly) {
      onSave(s, Date.now());
      return;
    }
    let e = dateStrToTs(endDate, endTime);
    if (e <= s) e = s + 60000; // 兜底
    onSave(s, e);
  };

  const inputCls =
    'w-full rounded-xl border border-line bg-bg-card2 px-3 py-2.5 text-white outline-none focus:border-binance [color-scheme:dark]';

  const labelCls = 'mb-1.5 text-xs text-text-secondary';
  const shifts: { label: string; min: number }[] = [
    { label: '开始 -5', min: -5 },
    { label: '开始 -15', min: -15 },
    { label: '开始 -30', min: -30 },
    { label: '开始 +5', min: 5 },
  ];
  const quickDurs = [15, 30, 45, 60, 90, 120];

  return (
    <BottomSheet open={open} onClose={onClose} title={title ?? '修改时间'}>
      <div className="space-y-4 pb-2">
        {/* 开始 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs text-text-secondary">开始</p>
            <div className="flex items-center gap-1">
              {shifts.map((s) => (
                <button
                  key={s.label}
                  onClick={() => shift(s.min)}
                  className="rounded-full border border-line px-2 py-0.5 text-[11px] text-text-secondary"
                >
                  {s.label.replace('开始 ', '')}m
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className={labelCls}>日期</p>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <p className={labelCls}>时刻</p>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* 结束（startOnly 模式隐藏） */}
        {!startOnly && (
          <div>
            <p className="mb-1.5 text-xs text-text-secondary">结束</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className={labelCls}>日期</p>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <p className={labelCls}>时刻</p>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {/* 时长预览 */}
        <div className="flex items-center justify-between rounded-xl bg-bg-card2 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <Clock size={14} /> 时长
          </span>
          <span className={`font-mono ${valid ? 'text-binance' : 'text-text-secondary'}`}>
            {startOnly
              ? `到现在 ${formatHM((Date.now() - dateStrToTs(startDate, startTime)) / 1000)}`
              : valid
              ? formatHM(durationMin * 60)
              : '— —'}
          </span>
        </div>

        {/* 快捷时长（仅完整模式） */}
        {!startOnly && (
          <div>
            <p className="mb-1.5 text-xs text-text-secondary">快捷时长</p>
            <div className="grid grid-cols-6 gap-1.5">
              {quickDurs.map((m) => {
                const baseStart = dateStrToTs(startDate, startTime);
                const cur = dateStrToTs(endDate, endTime);
                const active = Math.abs((cur - baseStart) / 60000 - m) < 0.5;
                return (
                  <button
                    key={m}
                    onClick={() => setQuickDuration(m)}
                    className={`rounded-lg border py-2 text-xs ${
                      active
                        ? 'border-binance bg-binance/10 text-binance'
                        : 'border-line text-text-secondary'
                    }`}
                  >
                    {m < 60 ? `${m}m` : `${m / 60}h`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={save}
          disabled={!valid}
          className="w-full rounded-xl bg-binance py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          保存
        </button>
      </div>
    </BottomSheet>
  );
}

function formatHM(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
