// override:true 让 .env 覆盖系统/用户级环境变量，避免本机残留旧 key 干扰
import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import planRouter from './routes/plan.js';

const app = express();

// CORS：白名单 + 开发模式自动放行任意 localhost/127.0.0.1（任意端口）
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isLocalDev = (origin) => {
  if (!origin) return true; // 同源 / curl 不带 Origin
  try {
    const u = new URL(origin);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname.endsWith('.localhost');
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin(origin, cb) {
      // 未配置白名单 → 全部放行（联调阶段）
      if (!allowedOrigins.length) return cb(null, true);
      // 配置了白名单：白名单内 OR 本地开发来源都放行
      if (!origin || allowedOrigins.includes(origin) || isLocalDev(origin)) {
        return cb(null, true);
      }
      cb(new Error('Not allowed by CORS'));
    },
  }),
);

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', authRouter);
app.use('/api/plan', planRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: 'Not Found' });
});

// 统一错误处理
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`迹时 server listening on http://127.0.0.1:${PORT}`);
});
