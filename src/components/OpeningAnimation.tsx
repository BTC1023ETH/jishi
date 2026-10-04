import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface Sentence {
  parts: { t: string; hl?: boolean; golden?: boolean }[];
  hold: number;
}

const SENTENCES: Sentence[] = [
  { parts: [{ t: '你无法管理' }, { t: '时间', hl: true }, { t: '。' }], hold: 1500 },
  { parts: [{ t: '但你可以决定它' }, { t: '流向', hl: true }, { t: '哪里。' }], hold: 1500 },
  { parts: [{ t: '让时间流向，更有价值的地方。', golden: true }], hold: 2200 },
];

type Phase = 'breathe' | 'flow' | 'converge';

export default function OpeningAnimation({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const phase: Phase = idx <= 1 ? 'breathe' : idx === 2 ? 'flow' : 'converge';

  // 文本序列调度
  useEffect(() => {
    if (idx >= SENTENCES.length) {
      const t = setTimeout(() => setDone(true), 1600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIdx((i) => i + 1), SENTENCES[idx].hold);
    return () => clearTimeout(t);
  }, [idx]);

  useEffect(() => {
    if (done) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
  }, [done, onDone]);

  // 粒子画布
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const N = 110;
    const particles = Array.from({ length: N }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 20 + Math.random() * 160,
      speed: 0.002 + Math.random() * 0.007,
      size: 0.6 + Math.random() * 1.7,
      drift: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const loop = () => {
      t += 1;
      const W = window.innerWidth;
      const H = window.innerHeight;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H / 2;
      const breath = 1 + Math.sin(t * 0.04) * 0.08;

      for (const p of particles) {
        p.angle += p.speed * (phase === 'converge' ? -1.6 : phase === 'flow' ? 1.5 : 1);
        if (phase === 'converge') {
          p.radius *= 0.97;
          if (p.radius < 3) p.radius = 90 + Math.random() * 170;
        }
        const x = cx + Math.cos(p.angle) * p.radius * breath;
        const y = cy + Math.sin(p.angle) * p.radius * breath;
        const alpha = 0.2 + 0.5 * Math.abs(Math.sin(t * 0.02 + p.drift));
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240,185,11,${alpha})`;
        ctx.fill();
      }

      const glowR = 130 * breath;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      g.addColorStop(0, 'rgba(240,185,11,0.45)');
      g.addColorStop(1, 'rgba(240,185,11,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [phase]);

  const skip = () => setDone(true);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-bg"
      animate={{ opacity: done ? 0 : 1 }}
      transition={{ duration: 0.5 }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      <div className="relative z-10 flex h-40 items-center justify-center px-8 text-center">
        <AnimatePresence mode="wait">
          {idx < SENTENCES.length && (
            <motion.p
              key={idx}
              className="text-2xl leading-relaxed text-white"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45 }}
            >
              {SENTENCES[idx].parts.map((part, i) =>
                part.hl ? (
                  <span key={i} className="font-semibold text-binance">
                    {part.t}
                  </span>
                ) : part.golden ? (
                  <span
                    key={i}
                    className="font-semibold"
                    style={{
                      backgroundImage: 'linear-gradient(90deg, #EAECEF 0%, #F0B90B 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    {part.t}
                  </span>
                ) : (
                  <span key={i}>{part.t}</span>
                ),
              )}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={skip}
        className="absolute right-5 top-6 z-10 rounded-full border border-line px-4 py-1.5 text-sm text-text-secondary"
      >
        跳过
      </button>
    </motion.div>
  );
}
