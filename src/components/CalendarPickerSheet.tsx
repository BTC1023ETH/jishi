import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { addDays, dayStart, formatFullDate, pad2 } from '../utils/time';

interface Props {
  open: boolean;
  value: number; // 当前选中的时间戳（精确到天）
  onClose: () => void;
  onPick: (ts: number) => void;
  title?: string;
}

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function buildMonthGrid(viewYear: number, viewMonth: number): { date: number; ts: number; inMonth: boolean }[] {
  // 返回 6 行 × 7 列 = 42 天
  const first = new Date(viewYear, viewMonth, 1);
  const firstWeekday = (first.getDay() + 6) % 7; // 周一为 0
  const startTs = dayStart(first.getTime()) - firstWeekday * 86400000;
  return Array.from({ length: 42 }, (_, i) => {
    const ts = startTs + i * 86400000;
    const d = new Date(ts);
    return {
      date: d.getDate(),
      ts,
      inMonth: d.getMonth() === viewMonth,
    };
  });
}

export default function CalendarPickerSheet({ open, value, onClose, onPick, title = '选择日期' }: Props) {
  const [viewYear, setViewYear] = useState(0);
  const [viewMonth, setViewMonth] = useState(0); // 0-based

  useEffect(() => {
    if (open) {
      const d = new Date(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [open, value]);

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayTs = useMemo(() => dayStart(Date.now()), []);
  const selectedTs = useMemo(() => dayStart(value), [value]);

  const goto = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="pb-2">
        {/* 头部：月切换 */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => goto(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-text-secondary"
            aria-label="上一月"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-base font-medium text-text">
            {viewYear} · {pad2(viewMonth + 1)}月
          </p>
          <button
            onClick={() => goto(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-text-secondary"
            aria-label="下一月"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* 周标头 */}
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-text-secondary">
          {WEEK_LABELS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map((g) => {
            const isToday = g.ts === todayTs;
            const isSelected = g.ts === selectedTs;
            return (
              <button
                key={g.ts}
                onClick={() => {
                  onPick(g.ts);
                  onClose();
                }}
                className={`relative flex h-10 flex-col items-center justify-center rounded-xl text-sm transition ${
                  isSelected
                    ? 'bg-binance text-black font-semibold'
                    : g.inMonth
                    ? 'text-text hover:bg-bg-card2'
                    : 'text-text-secondary/40'
                }`}
              >
                <span>{g.date}</span>
                {isToday && !isSelected && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-binance" />
                )}
              </button>
            );
          })}
        </div>

        {/* 快捷按钮 */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              const t = dayStart(Date.now());
              onPick(t);
              onClose();
            }}
            className="flex-1 rounded-xl border border-line py-2.5 text-sm text-text"
          >
            今天
          </button>
          <button
            onClick={() => {
              const t = addDays(dayStart(Date.now()), -1);
              onPick(t);
              onClose();
            }}
            className="flex-1 rounded-xl border border-line py-2.5 text-sm text-text"
          >
            昨天
          </button>
          <button
            onClick={() => {
              // 跳到选中日期所在月
              const d = new Date(value);
              setViewYear(d.getFullYear());
              setViewMonth(d.getMonth());
            }}
            className="flex-1 rounded-xl border border-line py-2.5 text-sm text-text-secondary"
          >
            跳到选中
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-text-secondary">
          当前：{formatFullDate(value)}
        </p>
      </div>
    </BottomSheet>
  );
}
