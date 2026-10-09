import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { formatHM } from '../utils/time';

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export default function ParticleButton() {
  const activeSession = useAppStore((s) => s.activeSession);
  const startTimer = useAppStore((s) => s.startTimer);
  const stopTimer = useAppStore((s) => s.stopTimer);

  const [now, setNow] = useState(Date.now());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const burstRef = useRef<HTMLCanvasElement>(null);
  const active = !!activeSession;
  const isCoarseRef = useRef<boolean>(false);
  const reducedRef = useRef<boolean>(false);

  useEffect(() => {
    isCoarseRef.current = window.matchMedia('(pointer: coarse)').matches;
    reducedRef.current = prefersReducedMotion();
  }, []);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const elapsed = active && activeSession ? Math.max(0, Math.floor((now - activeSession.startAt) / 1000)) : 0;
  const startedAt = activeSession?.startAt ?? Date.now();

  // 主循环：粒子环 + HUD 仪表环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const N = 110;
    const particles = Array.from({ length: N }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.004 + Math.random() * 0.008,
      size: 0.7 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const loop = () => {
      t += 1;
      const size = canvas.clientWidth;
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const baseR = size * (active ? 0.34 : 0.3);
      const breath = 1 + Math.sin(t * 0.03) * 0.04;

      // 粒子环
      for (const p of particles) {
        p.angle += p.speed * (active ? 4 : 1);
        const wobble = Math.sin(t * 0.02 + p.phase) * size * 0.012;
        const spread = active ? Math.sin(t * 0.05 + p.phase) * size * 0.05 : 0;
        const r = baseR * breath + wobble + spread;
        const x = cx + Math.cos(p.angle) * r;
        const y = cy + Math.sin(p.angle) * r;
        const alpha = active
          ? 0.4 + 0.6 * Math.abs(Math.sin(t * 0.1 + p.phase))
          : 0.18 + 0.3 * Math.abs(Math.sin(t * 0.02 + p.phase));
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240,185,11,${alpha})`;
        ctx.fill();
      }

      // 内辉光
      const glowR = size * (active ? 0.36 : 0.3) * breath;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      g.addColorStop(0, `rgba(240,185,11,${active ? 0.32 : 0.2})`);
      g.addColorStop(1, 'rgba(240,185,11,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      // HUD 仪表环
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * breath, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(240,185,11,${active ? 0.6 : 0.28})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 刻度
      const tickCount = 60;
      const tickInner = baseR * breath - 4;
      const tickOuter = baseR * breath + 6;
      ctx.strokeStyle = `rgba(240,185,11,${active ? 0.7 : 0.35})`;
      for (let i = 0; i < tickCount; i++) {
        const ang = (i / tickCount) * Math.PI * 2 - Math.PI / 2;
        const x1 = cx + Math.cos(ang) * tickInner;
        const y1 = cy + Math.sin(ang) * tickInner;
        const x2 = cx + Math.cos(ang) * tickOuter;
        const y2 = cy + Math.sin(ang) * tickOuter;
        ctx.lineWidth = i % 5 === 0 ? 1.6 : 0.7;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // 进度弧（active 时由 elapsed 推进）
      if (active) {
        const targetSec = 60 * 60; // 满环 = 1 小时
        const progress = Math.min(1, (elapsed * 1000) / (targetSec * 1000));
        ctx.beginPath();
        ctx.arc(cx, cy, baseR * breath - 2, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,216,102,0.95)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(240,185,11,0.7)';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 端点光点
        const ex = cx + Math.cos(-Math.PI / 2 + progress * Math.PI * 2) * (baseR * breath - 2);
        const ey = cy + Math.sin(-Math.PI / 2 + progress * Math.PI * 2) * (baseR * breath - 2);
        ctx.beginPath();
        ctx.fillStyle = '#FFE4A0';
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [active, elapsed]);

  // 粒子爆发（点击时）
  useEffect(() => {
    const c = burstRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type B = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number };
    let list: B[] = [];
    let raf = 0;
    const resize = () => {
      const w = c.clientWidth;
      const h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      const w = c.clientWidth;
      const h = c.clientHeight;
      ctx.clearRect(0, 0, w, h);
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life += 16;
        if (p.life > p.max) {
          list.splice(i, 1);
          continue;
        }
        p.x += p.vx * 16;
        p.y += p.vy * 16;
        p.vy += 0.02; // 重力
        const k = 1 - p.life / p.max;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,216,102,${0.9 * k})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        // 拖尾
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,216,102,${0.25 * k})`;
        ctx.arc(p.x - p.vx * 4, p.y - p.vy * 4, p.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // 冲击波
      ctx.save();
      ctx.translate(w / 2, h / 2);
      const ringAge = (Date.now() - lastRingTime) / 600;
      if (ringAge < 1) {
        const r = ringAge * (w / 2) * 0.95;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(240,185,11,${0.5 * (1 - ringAge)})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
      raf = requestAnimationFrame(loop);
    };
    let lastRingTime = 0;
    raf = requestAnimationFrame(loop);

    (window as unknown as { __jishiBurst?: (cx: number, cy: number) => void }).__jishiBurst = (cx, cy) => {
      if (reducedRef.current || isCoarseRef.current) {
        // 移动端或降级：仅震动效果即可
        return;
      }
      const rect = c.getBoundingClientRect();
      const ox = cx - rect.left;
      const oy = cy - rect.top;
      for (let i = 0; i < 80; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 0.18 + Math.random() * 0.3;
        list.push({
          x: ox,
          y: oy,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 0.1,
          life: 0,
          max: 600 + Math.random() * 400,
          size: 1.2 + Math.random() * 1.8,
        });
      }
      lastRingTime = Date.now();
    };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      delete (window as unknown as { __jishiBurst?: unknown }).__jishiBurst;
    };
  }, []);

  const toggle = (e: React.MouseEvent) => {
    const w = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const fn = (window as unknown as { __jishiBurst?: (x: number, y: number) => void }).__jishiBurst;
    fn?.(w.left + w.width / 2, w.top + w.height / 2);
    if (active) void stopTimer();
    else void startTimer();
  };

  return (
    <div
      className="relative mx-auto select-none"
      style={{ width: 'min(74vw, 340px)', height: 'min(74vw, 340px)' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <canvas
        ref={burstRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <button
        onClick={toggle}
        className="absolute inset-0 flex flex-col items-center justify-center transition active:scale-[0.98]"
      >
        {active ? (
          <span
            className="font-semibold tabular-nums tracking-tight text-white"
            style={{
              fontSize: 'clamp(2.4rem, 9vw, 3.6rem)',
              textShadow:
                '0 0 12px rgba(255,216,102,0.7), 0 0 24px rgba(240,185,11,0.45), 0 0 4px rgba(255,255,255,0.5)',
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            }}
          >
            {formatHM(elapsed)}
          </span>
        ) : (
          <span
            className="font-semibold tracking-[0.4em] text-binance"
            style={{
              fontSize: 'clamp(1.4rem, 5vw, 1.8rem)',
              textShadow: '0 0 14px rgba(240,185,11,0.5)',
            }}
          >
            开 始
          </span>
        )}
        <span
          className={`mt-2.5 text-[11px] uppercase tracking-[0.25em] ${
            active ? 'text-binance' : 'text-text-secondary'
          }`}
        >
          {active ? '◉ 计时中 · 点击停止' : '记录你的时间流向'}
        </span>
        {active && (
          <span className="mt-1 text-[10px] text-text-secondary/60">
            始于 {formatHM(0)} · 开始于 {new Date(startedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </button>
    </div>
  );
}
