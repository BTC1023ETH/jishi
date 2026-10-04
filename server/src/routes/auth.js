import { randomInt } from 'node:crypto';
import { Router } from 'express';
import { sendVerifyCode } from '../mailer.js';
import { createUser, findUser } from '../store.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 验证码内存存储：email -> { code, expires }
// 单实例够用；多实例部署需换成 Redis。
const codes = new Map();

// 频控：每邮箱 60 秒内仅允许发送一次
const lastSend = new Map();

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

/**
 * POST /api/send-code
 * body: { email }
 */
router.post('/send-code', async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || !EMAIL_RE.test(String(email))) {
    return res.status(400).json({ code: 400, message: '邮箱格式不正确' });
  }

  const key = normalizeEmail(email);
  const now = Date.now();
  if (lastSend.has(key) && now - lastSend.get(key) < 60000) {
    return res.status(429).json({ code: 429, message: '发送过于频繁，请稍后再试' });
  }

  // 生成 6 位数字验证码（100000 ~ 999999）
  const code = String(randomInt(100000, 1000000));
  const ttl = Number(process.env.CODE_TTL_MS || 600000);
  codes.set(key, { code, expires: now + ttl });
  lastSend.set(key, now);

  try {
    await sendVerifyCode(key, code);
    return res.json({ code: 0, message: '验证码已发送' });
  } catch (err) {
    console.error('[send-code] mail failed:', err.message);
    return res.status(500).json({ code: 500, message: '邮件发送失败，请稍后再试' });
  }
});

/**
 * POST /api/register
 * body: { email, code }
 * 验证通过后写入账号（已存在则直接返回）。
 */
router.post('/register', (req, res) => {
  const { email, code } = req.body ?? {};
  if (!email || !code) {
    return res.status(400).json({ code: 400, message: '参数缺失' });
  }

  const key = normalizeEmail(email);
  const item = codes.get(key);
  if (!item || item.expires < Date.now()) {
    codes.delete(key);
    return res.status(400).json({ code: 400, message: '验证码已过期，请重新获取' });
  }
  if (item.code !== String(code).trim()) {
    return res.status(400).json({ code: 400, message: '验证码错误' });
  }

  codes.delete(key);
  const user = findUser(key) ?? createUser(key);
  return res.json({ code: 0, message: '成功', data: { email: user.email, createdAt: user.createdAt } });
});

export default router;
