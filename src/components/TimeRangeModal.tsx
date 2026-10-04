import { useEffect, useState } from 'react';
import BottomSheet from './BottomSheet';
import { dateStrToTs, formatClock, formatFullDate } from '../utils/time';

interface Props {
  open: boolean;
  startAt: number;
  endAt: number;
  onClose: () => void;
  onSave: (startAt: number, endAt: number) => void;
}

export default function TimeRangeModal({ open, startAt, endAt, onClose, onSave }: Props) {
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    if (open) {
      setDate(formatFullDate(startAt));
      setStart(formatClock(startAt));
      setEnd(formatClock(endAt));
    }
  }, [open, startAt, endAt]);

  const save = () => {
    let s = dateStrToTs(date, start);
    let e = dateStrToTs(date, end);
    if (e <= s) e += 86400000; // 跨夜
    if (e <= s) e = s + 60000;
    onSave(s, e);
  };

  const inputCls =
    'w-full rounded-xl border border-line bg-bg-card2 px-3 py-2.5 text-white outline-none focus:border-binance';

  return (
    <BottomSheet open={open} onClose={onClose} title="修改时间">
      <div className="space-y-4 pb-2">
        <div>
          <p className="mb-1.5 text-xs text-text-secondary">日期</p>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 text-xs text-text-secondary">开始</p>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-text-secondary">结束</p>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </div>
        </div>
        <button onClick={save} className="w-full rounded-xl bg-binance py-3 text-sm font-semibold text-black">
          保存
        </button>
      </div>
    </BottomSheet>
  );
}
