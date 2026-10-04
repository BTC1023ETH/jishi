import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { formatClock } from '../utils/time';
import BottomSheet from './BottomSheet';

interface Props {
  level: '1h' | '4h' | 'forgot' | null;
  onDismiss: () => void;
}

export default function ReminderModal({ level, onDismiss }: Props) {
  const stopTimer = useAppStore((s) => s.stopTimer);
  const stopTimerAt = useAppStore((s) => s.stopTimerAt);
  const activeSession = useAppStore((s) => s.activeSession);

  const [editing, setEditing] = useState(false);
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (level) {
      setEndTime(formatClock(Date.now()));
      setEditing(false);
    }
  }, [level]);

  const label =
    level === '1h' ? '已连续记录 1 小时' : level === '4h' ? '已连续记录 4 小时' : '计时似乎忘记停止了';

  const confirmEdit = () => {
    if (!activeSession) return;
    const now = new Date();
    const [h, m] = endTime.split(':').map(Number);
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0).getTime();
    if (end < activeSession.startAt) end += 86400000;
    void stopTimerAt(end);
  };

  return (
    <BottomSheet open={!!level} onClose={onDismiss} title={label}>
      <div className="space-y-3 pb-2">
        {editing && (
          <div className="flex items-center gap-3 rounded-xl bg-bg-card2 px-3 py-2.5">
            <span className="text-sm text-text-secondary">结束时间</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white outline-none"
            />
          </div>
        )}
        <button onClick={onDismiss} className="w-full rounded-xl bg-binance py-3 text-sm font-semibold text-black">
          继续
        </button>
        <button
          onClick={() => void stopTimer()}
          className="w-full rounded-xl border border-line py-3 text-sm text-text-secondary"
        >
          已结束
        </button>
        <button
          onClick={() => (editing ? confirmEdit() : setEditing(true))}
          className="w-full rounded-xl border border-line py-3 text-sm text-text-secondary"
        >
          {editing ? '确认归档' : '修改结束时间'}
        </button>
      </div>
    </BottomSheet>
  );
}
