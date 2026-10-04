import { motion } from 'framer-motion';
import { BarChart3, CircleDot, Sparkles, User } from 'lucide-react';
import { useAppStore } from '../store';
import type { TabId } from '../types';

const TABS: { id: TabId; label: string; icon: typeof CircleDot }[] = [
  { id: 'record', label: '记录', icon: CircleDot },
  { id: 'stats', label: '统计', icon: BarChart3 },
  { id: 'insights', label: '洞察', icon: Sparkles },
  { id: 'profile', label: '我的', icon: User },
];

export default function BottomNav() {
  const tab = useAppStore((s) => s.tab);
  const setTab = useAppStore((s) => s.setTab);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} className="flex flex-col items-center gap-1 py-2.5">
              <motion.div
                animate={active ? { y: -3 } : { y: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 16 }}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 2}
                  className={active ? 'text-binance' : 'text-text-secondary'}
                />
              </motion.div>
              <span className={`text-[11px] ${active ? 'text-binance' : 'text-text-secondary'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
