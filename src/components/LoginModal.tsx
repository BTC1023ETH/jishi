import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { isValidEmail, sendVerifyCode, verifyCode } from '../utils/auth';
import BottomSheet from './BottomSheet';

export default function LoginModal() {
  const open = useAppStore((s) => s.loginOpen);
  const setOpen = useAppStore((s) => s.setLoginOpen);
  const setUser = useAppStore((s) => s.setUser);
  const showToast = useAppStore((s) => s.showToast);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (open) {
      setEmail('');
      setCode('');
      setCountdown(0);
    }
  }, [open]);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const handleSend = async () => {
    if (!isValidEmail(email)) {
      showToast('请输入有效邮箱');
      return;
    }
    setSending(true);
    try {
      const res = await sendVerifyCode(email);
      // 开发环境返回模拟验证码便于测试；生产环境由后端真实发信，不返回验证码
      showToast(res.mockCode ? `验证码（模拟）已发送：${res.mockCode}` : '验证码已发送，请查收邮件');
      setCountdown(60);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '发送失败，请稍后再试');
    } finally {
      setSending(false);
    }
  };

  const handleLogin = async () => {
    if (!isValidEmail(email)) {
      showToast('请输入有效邮箱');
      return;
    }
    if (code.length !== 6) {
      showToast('请输入 6 位验证码');
      return;
    }
    setSending(true);
    try {
      const ok = await verifyCode(email, code);
      if (!ok) {
        showToast('验证码错误或已过期');
        return;
      }
      void setUser({ email: email.trim(), syncedAt: Date.now() });
      showToast('登录成功');
      setOpen(false);
    } catch {
      showToast('网络异常，请稍后再试');
    } finally {
      setSending(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-line bg-bg-card2 px-3 py-2.5 text-white outline-none focus:border-binance';

  return (
    <BottomSheet open={open} onClose={() => setOpen(false)} title="登录 / 注册">
      <div className="space-y-4 pb-2">
        <p className="text-xs leading-relaxed text-text-secondary">
          仅需邮箱验证码，登录后本地数据与云端合并（匿名也可正常使用）。验证码将通过邮件发送，10 分钟内有效。
        </p>
        <div>
          <p className="mb-1.5 text-xs text-text-secondary">邮箱</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs text-text-secondary">验证码</p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6 位数字"
              className={inputCls}
            />
            <button
              onClick={handleSend}
              disabled={sending || countdown > 0}
              className="shrink-0 rounded-xl border border-binance px-4 text-sm text-binance disabled:opacity-40"
            >
              {countdown > 0 ? `${countdown}s` : sending ? '发送中' : '获取验证码'}
            </button>
          </div>
        </div>
        <button
          onClick={handleLogin}
          disabled={sending}
          className="w-full rounded-xl bg-binance py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          {sending ? '处理中…' : '登录'}
        </button>
      </div>
    </BottomSheet>
  );
}
