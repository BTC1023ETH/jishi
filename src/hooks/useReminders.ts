import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { isInSleepWindow } from '../utils/time';

export type ReminderLevel = '1h' | '4h' | 'forgot';

export function useReminders() {
  const activeSession = useAppStore((s) => s.activeSession);
  const settings = useAppStore((s) => s.settings);
  const [level, setLevel] = useState<ReminderLevel | null>(null);
  const fired = useRef<Set<string>>(new Set());

  // 新计时 / 设置变更时重置
  useEffect(() => {
    fired.current.clear();
    setLevel(null);
  }, [activeSession?.startAt, settings.timeoutInterval, settings.forgotStopReminder]);

  useEffect(() => {
    if (!activeSession) return;
    const check = () => {
      if (isInSleepWindow(Date.now(), settings.sleepStart, settings.sleepEnd)) return;
      const elapsedSec = (Date.now() - activeSession.startAt) / 1000;

      if (settings.timeoutInterval !== 'off') {
        const thresholds = settings.timeoutInterval === '4h' ? [3600, 14400] : [3600];
        for (const t of thresholds) {
          const key = String(t);
          if (elapsedSec >= t && !fired.current.has(key)) {
            fired.current.add(key);
            setLevel(t === 3600 ? '1h' : '4h');
            return;
          }
        }
      }

      if (settings.forgotStopReminder && elapsedSec >= 21600 && !fired.current.has('forgot')) {
        fired.current.add('forgot');
        setLevel('forgot');
      }
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [activeSession, settings]);

  return { level, dismiss: () => setLevel(null) };
}
