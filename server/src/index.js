import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';

const app = express();

// CORS：优先使用 .env 配置的来源白名单；未配置则放开（便于联调）
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!allowedOrigins.length || !origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'));
      }
    },
  }),
);

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', authRouter);

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
