import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { formatHM } from '../utils/time';

export default function ParticleButton() {
  const activeSession = useAppStore((s) => s.activeSession);
  const startTimer = useAppStore((s) => s.startTimer);
  const stopTimer = useAppStore((s) => s.stopTimer);

  const [now, setNow] = useState(Date.now());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = !!activeSession;

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const elapsed = active && activeSession ? Math.max(0, Math.floor((now - activeSession.startAt) / 1000)) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
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

    const N = 90;
    const particles = Array.from({ length: N }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.004 + Math.random() * 0.008,
      size: 0.8 + Math.random() * 1.8,
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
      const breath = 1 + Math.sin(t * 0.03) * 0.05;

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

      const glowR = size * (active ? 0.36 : 0.3) * breath;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      g.addColorStop(0, `rgba(240,185,11,${active ? 0.32 : 0.2})`);
      g.addColorStop(1, 'rgba(240,185,11,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, baseR * breath, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(240,185,11,${active ? 0.65 : 0.28})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  const toggle = () => {
    if (active) void stopTimer();
    else void startTimer();
  };

  return (
    <div className="relative mx-auto" style={{ width: 'min(68vw, 320px)', height: 'min(68vw, 320px)' }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <button onClick={toggle} className="absolute inset-0 flex flex-col items-center justify-center">
        {active ? (
          <span className="text-5xl font-semibold tabular-nums tracking-tight text-white">{formatHM(elapsed)}</span>
        ) : (
          <span className="text-2xl font-semibold tracking-[0.3em] text-binance">开始</span>
        )}
        <span className={`mt-2 text-xs ${active ? 'text-binance' : 'text-text-secondary'}`}>
          {active ? '点击停止' : '记录你的时间流向'}
        </span>
      </button>
    </div>
  );
}
