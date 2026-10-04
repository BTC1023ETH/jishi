import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SLOGAN } from './constants';
import { initDB } from './db';
import { useReminders } from './hooks/useReminders';
import { useAppStore } from './store';
import { formatHM } from './utils/time';
import ArchiveSheet from './components/ArchiveSheet';
import BottomNav from './components/BottomNav';
import LoginModal from './components/LoginModal';
import OpeningAnimation from './components/OpeningAnimation';
import RecordDetailModal from './components/RecordDetailModal';
import ReminderModal from './components/ReminderModal';
import SleepSheet from './components/SleepSheet';
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
    if (!activeSession) {
      document.title = `迹时 · ${SLOGAN}`;
      if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
      return;
    }
    const update = () => {
      const sec = Math.floor((Date.now() - activeSession.startAt) / 1000);
      document.title = `[计时中 ${formatHM(sec)}] 迹时`;
    };
    update();
    const id = setInterval(update, 1000);
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: '迹时 · 计时中',
          artist: SLOGAN,
        });
      } catch {
        /* 浏览器不支持时忽略 */
      }
    }
    return () => clearInterval(id);
  }, [activeSession?.startAt]);

  const pages = {
    record: <RecordPage />,
    stats: <StatsPage />,
    insights: <InsightsPage />,
    profile: <ProfilePage />,
  } as const;

  return (
    <div className="min-h-screen bg-bg text-text">
      {showOpening && <OpeningAnimation onDone={() => setShowOpening(false)} />}

      <AnimatePresence mode="wait">
        <motion.main
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {pages[tab]}
        </motion.main>
      </AnimatePresence>

      <BottomNav />

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
            className="pointer-events-none fixed left-1/2 top-6 z-[120] -translate-x-1/2 rounded-full border border-line bg-bg-card px-4 py-2 text-sm text-text shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
