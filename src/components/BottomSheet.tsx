import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function BottomSheet({ open, onClose, title, children }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="no-scrollbar fixed bottom-0 left-0 right-0 z-50 mx-auto max-h-[88vh] max-w-md overflow-y-auto rounded-t-3xl border-t border-line bg-bg-card px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            {title && (
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-text">{title}</h3>
                <button onClick={onClose} className="text-text-secondary">
                  <X size={20} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
