import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SLOGAN } from './constants';
import { initDB } from './db';
import { useReminders } from './hooks/useReminders';
import { useAppStore } from './store';
import { formatHM } from './utils/time';
import {
  setMediaActionHandlers,
  startMediaSession,
  stopMediaSession,
  updateMediaSession,
} from './utils/mediaSession';
import ArchiveSheet from './components/ArchiveSheet';
import BottomNav from './components/BottomNav';
import CursorGlow from './components/CursorGlow';
import InstallPWAHint from './components/InstallPWAHint';
import LoginModal from './components/LoginModal';
import OpeningAnimation from './components/OpeningAnimation';
import RecordDetailModal from './components/RecordDetailModal';
import ReminderModal from './components/ReminderModal';
import SleepSheet from './components/SleepSheet';
import StarfieldBackground from './components/StarfieldBackground';
import InsightsPage from './pages/InsightsPage';
import ProfilePage from './pages/ProfilePage';
import RecordPage from './pages/RecordPage';
import StatsPage from './pages/StatsPage';

export default function App() {
  const tab = useAppStore((s) => s.tab);
  const activeSession = useAppStore((s) => s.activeSession);
  const toast = useAppStore((s) => s.toast);
  const [showOpening, setShowOpening] = useState(true);
  const { level, dismiss } = useReminders();

  useEffect(() => {
    void (async () => {
      await initDB();
      await useAppStore.getState().hydrate();
    })();
  }, []);

  // 浏览器标题 + 媒体会话（锁屏/通知中心）
  useEffect(() => {
    // 媒体会话动作处理（点击锁屏上的暂停会停止计时）
    setMediaActionHandlers({
      onPause: () => {
        // 锁屏点暂停 → 触发停止计时流程
        void useAppStore.getState().stopTimer();
      },
      onStop: () => {
        void useAppStore.getState().stopTimer();
      },
    });
    return () => {
      setMediaActionHandlers({});
    };
  }, []);

  useEffect(() => {
    if (!activeSession) {
      document.title = `迹时 · ${SLOGAN}`;
      stopMediaSession();
      return;
    }
    const update = () => {
      const sec = Math.floor((Date.now() - activeSession.startAt) / 1000);
      document.title = `[计时中 ${formatHM(sec)}] 迹时`;
      updateMediaSession({ title: `计时中 ${formatHM(sec)}` });
    };
    update();
    const id = setInterval(update, 1000);
    startMediaSession({ title: '迹时 · 正在计时', artist: SLOGAN });
    return () => clearInterval(id);
  }, [activeSession?.startAt]);

  const pages = {
    record: <RecordPage />,
    stats: <StatsPage />,
    insights: <InsightsPage />,
    profile: <ProfilePage />,
  } as const;

  return (
    <div className="min-h-screen text-text">
      {/* 全局视觉层（#10） */}
      <StarfieldBackground />
      <CursorGlow />

      {showOpening && <OpeningAnimation onDone={() => setShowOpening(false)} />}

      <AnimatePresence mode="wait">
        <motion.main
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="relative z-10"
        >
          {pages[tab]}
        </motion.main>
      </AnimatePresence>

      <BottomNav />

      <InstallPWAHint />

      <ArchiveSheet />
      <SleepSheet />
      <LoginModal />
      <RecordDetailModal />
      <ReminderModal level={level} onDismiss={dismiss} />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed left-1/2 top-6 z-[120] -translate-x-1/2 rounded-full border border-binance/40 bg-bg-card/80 px-4 py-2 text-sm text-text shadow-lg backdrop-blur"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
