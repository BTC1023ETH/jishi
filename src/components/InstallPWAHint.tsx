import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'jishi-pwa-hint-dismissed';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // @ts-expect-error 旧 Safari 走 this
  if (navigator.standalone === true) return true;
  return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
}

export default function InstallPWAHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    // 已安装或被永久关闭则不提示
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // 延后弹出，避免首屏加载就被遮罩
      setTimeout(() => setShow(true), 2500);
    };
    window.addEventListener('beforeinstallprompt', onBefore);

    // iOS 单独处理
    if (isIOS() && !isStandalone()) {
      setTimeout(() => setShow(true), 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', onBefore);
  }, []);

  const dismiss = (forever = false) => {
    setShow(false);
    setShowIOSHelp(false);
    if (forever) localStorage.setItem(DISMISS_KEY, '1');
  };

  const onInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    dismiss(true);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-1/2 z-40 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-binance/40 bg-bg-card/95 p-3.5 shadow-2xl backdrop-blur"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-binance/15 text-binance">
              {isIOS() ? <Share2 size={18} /> : <Download size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text">添加到主屏幕</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {isIOS()
                  ? 'iOS 暂未支持一键安装，请在 Safari 中点击「分享」→「添加到主屏幕」'
                  : '安装后可全屏使用、锁屏计时提示更稳定'}
              </p>
              {!isIOS() && (
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={onInstall}
                    className="rounded-lg bg-binance px-3 py-1.5 text-xs font-semibold text-black"
                  >
                    安装
                  </button>
                  <button
                    onClick={() => dismiss(true)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-text-secondary"
                  >
                    不再提示
                  </button>
                </div>
              )}
              {isIOS() && (
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={() => setShowIOSHelp(true)}
                    className="rounded-lg bg-binance px-3 py-1.5 text-xs font-semibold text-black"
                  >
                    怎么操作？
                  </button>
                  <button
                    onClick={() => dismiss(true)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-text-secondary"
                  >
                    知道了
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => dismiss(false)}
              className="-mt-1 -mr-1 flex h-7 w-7 items-center justify-center rounded-full text-text-secondary"
              aria-label="关闭"
            >
              <X size={16} />
            </button>
          </div>

          {showIOSHelp && (
            <div className="mt-3 rounded-lg border border-line bg-bg-card2 p-2.5 text-[11px] text-text-secondary">
              1. 点击底部 Safari 的「分享」按钮（向上箭头图标）<br />
              2. 下滑找到并点击「添加到主屏幕」<br />
              3. 点击右上角「添加」即可
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
