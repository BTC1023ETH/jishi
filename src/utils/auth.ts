/**
 * 邮箱验证码登录。
 *
 * - 开发环境（localhost / `npm run dev`）：本地模拟，直接返回验证码便于测试。
 * - 生产环境（构建部署后）：调用后端 `api.jadebeads.cn` 的真实邮件接口。
 *
 * 后端接口见 server/：POST /api/send-code、POST /api/register。
 */

interface CodeItem {
  code: string;
  expires: number;
}

const codeStore = new Map<string, CodeItem>();

const IS_DEV = import.meta.env.DEV;
// 生产环境后端地址，可通过 VITE_API_BASE 覆盖
const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.jadebeads.cn';

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export interface SendResult {
  /** 仅开发环境返回，用于本地展示模拟验证码 */
  mockCode?: string;
}

/** 发送验证码。开发环境返回 mockCode，生产环境请求后端真实发信。 */
export async function sendVerifyCode(email: string): Promise<SendResult> {
  if (!IS_DEV) {
    const res = await fetch(`${API_BASE}/api/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.code !== 0) {
      throw new Error((data && data.message) || '验证码发送失败');
    }
    return {};
  }

  // 开发环境：本地模拟，不落盘、不联网
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codeStore.set(email, { code, expires: Date.now() + 10 * 60 * 1000 });
  return { mockCode: code };
}

/** 校验验证码。开发环境本地校验，生产环境请求后端校验。 */
export async function verifyCode(email: string, code: string): Promise<boolean> {
  if (!IS_DEV) {
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      return res.ok && data.code === 0;
    } catch {
      return false;
    }
  }

  const item = codeStore.get(email);
  if (!item) return false;
  if (Date.now() > item.expires) {
    codeStore.delete(email);
    return false;
  }
  return item.code === code.trim();
}

export function clearCode(email: string) {
  codeStore.delete(email);
}
