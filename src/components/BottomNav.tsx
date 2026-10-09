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
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-binance/15 bg-bg-card/85 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} className="relative flex flex-col items-center gap-1 py-2.5">
              {active && (
                <motion.span
                  layoutId="bottomnav-active"
                  className="pointer-events-none absolute -top-px h-0.5 w-10 rounded-full bg-binance"
                  style={{ boxShadow: '0 0 12px rgba(240,185,11,0.8)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <motion.div
                animate={active ? { y: -2, scale: 1.05 } : { y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 2}
                  className={active ? 'text-binance' : 'text-text-secondary'}
                  style={active ? { filter: 'drop-shadow(0 0 6px rgba(240,185,11,0.6))' } : undefined}
                />
              </motion.div>
              <span
                className={`text-[11px] tracking-wider ${
                  active ? 'text-binance' : 'text-text-secondary'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
